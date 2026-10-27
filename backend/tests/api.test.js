process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
process.env.ANTHROPIC_API_KEY = 'sk-test-key-123';
process.env.AI_RETRY_BASE_MS = '5';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

let fakeAi; const aiCalls = []; let aiMode = 'ok';
let base; let server; let app; let db; let provider; let TicketRepo;
const tokens = {};

const call = async (method, path, { token, body } = {}) => {
    const res = await fetch(`${base}/api/v1${path}`, {
        method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
        body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json, data: json?.data };
};
const waitFor = async (fn, ms = 4000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 50)); }
    return null;
};
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).data.token;

before(async () => {
    fakeAi = http.createServer((req, res) => {
        let raw = ''; req.on('data', (c) => { raw += c; });
        req.on('end', () => {
            const body = JSON.parse(raw); aiCalls.push({ headers: req.headers, body });
            if (aiMode === 'down') { res.writeHead(503); return res.end('{}'); }
            const isClassify = body.system.includes('triage');
            const text = isClassify
                ? JSON.stringify(/royalt/i.test(body.messages[0].content) ? { category: 'Royalty & Payments', priority: 'critical' } : { category: 'General Inquiry', priority: 'low' })
                : 'Hi Ananya,\n\nI am sorry for the wait. Our team will look into this within 48 hours.\n\nWarm regards,\nBookLeaf Author Support';
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
        });
    });
    await new Promise((r) => fakeAi.listen(0, r));
    process.env.AI_BASE_URL = `http://localhost:${fakeAi.address().port}`;

    app = require('../src/app'); db = require('../src/config/db'); provider = require('../src/services/ai/provider');
    TicketRepo = require('../src/repositories/TicketRepository');
    await require('../src/db/migrate').migrate();
    await db.pool.query('TRUNCATE tickets, ticket_messages, ticket_notes CASCADE');
    await require('../src/db/seed').seed();
    server = app.listen(0); base = `http://localhost:${server.address().port}`;

    tokens.ananya = await login('ananya.reddy@email.com', 'password123');
    tokens.priya = await login('priya.sharma@email.com', 'password123');
    tokens.sneha = await login('sneha.kulkarni@email.com', 'password123');
    tokens.admin = await login('admin@bookleaf.com', 'admin123');
});
after(async () => { server.close(); fakeAi.close(); await db.pool.end(); });

describe('auth', () => {
    test('rejects bad credentials with 401 and a clear code', async () => {
        const r = await call('POST', '/auth/login', { body: { email: 'priya.sharma@email.com', password: 'nope' } });
        assert.equal(r.status, 401); assert.equal(r.body.errorCode, 'INVALID_CREDENTIALS');
    });
    test('validates login input with field details (422)', async () => {
        const r = await call('POST', '/auth/login', { body: { email: 'not-an-email', password: '' } });
        assert.equal(r.status, 422); assert.ok(r.body.details.email);
    });
    test('login returns token + user; /me works; no token / bad token => 401', async () => {
        const r = await call('POST', '/auth/login', { body: { email: 'ADMIN@bookleaf.com', password: 'admin123' } });
        assert.equal(r.data.user.role, 'admin'); assert.ok(r.data.token);
        assert.equal((await call('GET', '/auth/me', { token: tokens.admin })).data.email, 'admin@bookleaf.com');
        assert.equal((await call('GET', '/tickets')).status, 401);
        assert.equal((await call('GET', '/tickets', { token: 'garbage' })).body.errorCode, 'INVALID_TOKEN');
    });
});

describe('books', () => {
    test('authors only see their own books; in-production books are handled', async () => {
        assert.equal((await call('GET', '/books', { token: tokens.ananya })).data.length, 1);
        const sneha = (await call('GET', '/books', { token: tokens.sneha })).data;
        assert.equal(sneha.length, 3);
        const prod = sneha.find((b) => b.bookId === 'BK013');
        assert.equal(prod.mrp, null); assert.equal(prod.publicationDate, null); assert.equal(prod.totalCopiesSold, 0);
        const bk1 = (await call('GET', '/books', { token: tokens.priya })).data.find((b) => b.bookId === 'BK001');
        assert.equal(bk1.royaltyPending, 3570); assert.equal(bk1.publicationDate, '2023-06-20');
    });
    test('admin sees all 18 books', async () => assert.equal((await call('GET', '/books', { token: tokens.admin })).data.length, 18));
});

describe('ticket lifecycle + RBAC', () => {
    let ticketId;
    test('validation errors are field-level 422s; foreign book rejected', async () => {
        const r = await call('POST', '/tickets', { token: tokens.ananya, body: { subject: 'x', description: 'short' } });
        assert.equal(r.status, 422); assert.ok(r.body.details.subject && r.body.details.description);
        const foreign = await call('POST', '/tickets', { token: tokens.ananya, body: { bookId: 'BK001', subject: 'Hello there', description: 'This is not my book at all' } });
        assert.equal(foreign.status, 422); assert.ok(foreign.body.details.bookId);
    });
    test('author creates a ticket (201); AI classifies + pre-drafts in the background', async () => {
        const r = await call('POST', '/tickets', { token: tokens.ananya, body: { bookId: 'BK005', subject: 'No royalty for 6 months', description: 'I have not received any royalty since my book went live.' } });
        assert.equal(r.status, 201); ticketId = r.data.id;
        assert.equal(r.data.status, 'open'); assert.equal(r.data.book.title, 'Between Two Temples');
        assert.equal('aiDraft' in r.data, false); assert.equal('notes' in r.data, false); // author view hides internals
        const t = await waitFor(async () => { const x = (await call('GET', `/tickets/${ticketId}`, { token: tokens.admin })).data; return x.categorySource === 'ai' && x.aiDraft ? x : null; });
        assert.ok(t, 'ticket should be AI-classified with a pre-generated draft');
        assert.equal(t.category, 'Royalty & Payments'); assert.equal(t.priority, 'critical');
    });
    test('other authors cannot read it (404) and authors cannot use admin routes (403)', async () => {
        assert.equal((await call('GET', `/tickets/${ticketId}`, { token: tokens.priya })).status, 404);
        assert.equal((await call('PATCH', `/tickets/${ticketId}`, { token: tokens.ananya, body: { status: 'closed' } })).status, 403);
        assert.equal((await call('POST', `/tickets/${ticketId}/messages`, { token: tokens.ananya, body: { body: 'hi' } })).status, 403);
        assert.equal((await call('POST', `/tickets/${ticketId}/draft`, { token: tokens.ananya })).status, 403);
        assert.equal((await call('POST', '/tickets', { token: tokens.admin, body: { subject: 'abc', description: 'admins cannot create' } })).status, 403);
        assert.equal((await call('GET', '/tickets/not-a-uuid', { token: tokens.admin })).status, 422);
    });
    test('author list is scoped to own tickets and can include messages', async () => {
        const r = await call('GET', '/tickets?include=messages', { token: tokens.ananya });
        assert.ok(r.data.items.every((t) => t.author.email === 'ananya.reddy@email.com' && Array.isArray(t.messages)));
    });
    test('admin overrides category/priority (source=admin), assigns self, rejects bad assignee/empty patch', async () => {
        const me = (await call('GET', '/auth/me', { token: tokens.admin })).data;
        const r = await call('PATCH', `/tickets/${ticketId}`, { token: tokens.admin, body: { priority: 'high', category: 'General Inquiry', assigneeId: me.id } });
        assert.equal(r.data.priority, 'high'); assert.equal(r.data.prioritySource, 'admin'); assert.equal(r.data.categorySource, 'admin'); assert.equal(r.data.assignee.id, me.id);
        assert.equal((await call('PATCH', `/tickets/${ticketId}`, { token: tokens.admin, body: { assigneeId: 'AUTH001' } })).status, 422);
        assert.equal((await call('PATCH', `/tickets/${ticketId}`, { token: tokens.admin, body: {} })).status, 422);
        assert.equal((await call('PATCH', `/tickets/${ticketId}`, { token: tokens.admin, body: { status: 'weird' } })).status, 422);
    });
    test('late AI results never overwrite an admin override', async () => {
        await TicketRepo.setClassification(ticketId, { category: 'Royalty & Payments', priority: 'critical', source: 'ai' });
        const t = (await call('GET', `/tickets/${ticketId}`, { token: tokens.admin })).data;
        assert.equal(t.category, 'General Inquiry'); assert.equal(t.priority, 'high');
    });
    test('reply: stored, moves open->in_progress, visible to author; note stays private', async () => {
        assert.equal((await call('POST', `/tickets/${ticketId}/messages`, { token: tokens.admin, body: { body: '   ' } })).status, 422);
        assert.equal((await call('POST', `/tickets/${ticketId}/messages`, { token: tokens.admin, body: { body: 'We are escalating this now.' } })).status, 201);
        assert.equal((await call('POST', `/tickets/${ticketId}/notes`, { token: tokens.admin, body: { body: 'Finance to confirm bank details' } })).status, 201);
        const author = (await call('GET', `/tickets/${ticketId}`, { token: tokens.ananya })).data;
        assert.equal(author.status, 'in_progress'); assert.equal(author.messages.length, 1); assert.equal(author.messages[0].sender, 'admin');
        assert.equal(JSON.stringify(author).includes('Finance to confirm'), false);
        const admin = (await call('GET', `/tickets/${ticketId}`, { token: tokens.admin })).data;
        assert.equal(admin.notes.length, 1); assert.equal(admin.aiDraft, ''); // sent => cached draft cleared
    });
});

describe('admin queue', () => {
    test('urgency sort puts critical/open first; resolved/closed last', async () => {
        const items = (await call('GET', '/tickets?sort=urgency&pageSize=100', { token: tokens.admin })).data.items;
        assert.equal(items[0].priority, 'critical');
        const firstDone = items.findIndex((t) => ['resolved', 'closed'].includes(t.status));
        assert.ok(items.slice(firstDone).every((t) => ['resolved', 'closed'].includes(t.status)));
    });
    test('filters, pagination and validation', async () => {
        const closed = (await call('GET', '/tickets?status=closed', { token: tokens.admin })).data;
        assert.ok(closed.items.length >= 1 && closed.items.every((t) => t.status === 'closed'));
        const p = (await call('GET', '/tickets?pageSize=2&page=2&sort=urgency', { token: tokens.admin })).data;
        assert.equal(p.items.length, 2); assert.ok(p.total >= 7);
        assert.ok((await call('GET', '/tickets?assignee=unassigned', { token: tokens.admin })).data.items.every((t) => t.assignee === null));
        const today = new Date().toISOString().slice(0, 10);
        assert.ok((await call('GET', `/tickets?from=${today}&to=${today}`, { token: tokens.admin })).data.total >= 1);
        assert.equal((await call('GET', '/tickets?status=bogus', { token: tokens.admin })).status, 422);
        assert.equal((await call('GET', '/tickets?status=open&status=closed', { token: tokens.admin })).status, 422);
    });
});

describe('AI integration', () => {
    test('draft prompt is cost-aware (one KB section, one book, no key leaked to clients)', async () => {
        provider.resetBreaker(); aiCalls.length = 0; aiMode = 'ok';
        const r = await call('POST', '/tickets', { token: tokens.priya, body: { bookId: 'BK001', subject: 'Royalty question', description: 'How is my royalty calculated for Whispers of the Ganges?' } });
        const id = r.data.id;
        await waitFor(async () => (await call('GET', `/tickets/${id}`, { token: tokens.admin })).data.categorySource === 'ai');
        aiCalls.length = 0;
        const d = await call('POST', `/tickets/${id}/draft`, { token: tokens.admin });
        assert.equal(d.status, 200); assert.match(d.data.draft, /Warm regards/);
        const sent = aiCalls[0].body; const user = sent.messages[0].content;
        assert.ok(user.includes('Royalty policy') && !user.includes('Production stages')); // only the relevant KB section
        assert.ok(user.includes('"royaltyPending":3570') && !user.includes('Saffron'));      // only the relevant book's facts
        assert.equal(aiCalls[0].headers['x-api-key'], 'sk-test-key-123');
        assert.equal(JSON.stringify(d.body).includes('sk-test-key'), false);
    });
    test('AI down: tickets still created + rule-classified, draft endpoint returns 503, manual reply still works', async () => {
        aiMode = 'down'; provider.resetBreaker();
        const r = await call('POST', '/tickets', { token: tokens.ananya, body: { subject: 'Blurry print quality', description: 'My author copies came with blurry misprinted pages.' } });
        assert.equal(r.status, 201);
        const t = await waitFor(async () => { const x = (await call('GET', `/tickets/${r.data.id}`, { token: tokens.admin })).data; return x.category === 'Printing & Quality' ? x : null; });
        assert.ok(t, 'fallback classifier should route it'); assert.equal(t.categorySource, 'default'); assert.equal(t.priority, 'high');
        const d = await call('POST', `/tickets/${r.data.id}/draft`, { token: tokens.admin });
        assert.equal(d.status, 503); assert.equal(d.body.errorCode, 'AI_UNAVAILABLE');
        assert.equal((await call('POST', `/tickets/${r.data.id}/messages`, { token: tokens.admin, body: { body: 'Manual reply while AI is down.' } })).status, 201);
    });
    test('circuit breaker stops hammering a failing provider', async () => {
        aiMode = 'down'; provider.resetBreaker();
        const id = (await call('GET', '/tickets?pageSize=1', { token: tokens.admin })).data.items[0].id;
        for (let i = 0; i < 3; i += 1) await call('POST', `/tickets/${id}/draft`, { token: tokens.admin });
        aiCalls.length = 0;
        const r = await call('POST', `/tickets/${id}/draft`, { token: tokens.admin });
        assert.equal(r.status, 503); assert.equal(aiCalls.length, 0, 'no outbound call while breaker is open');
        provider.resetBreaker(); aiMode = 'ok';
    });
});

describe('platform', () => {
    test('JSON 404 and malformed JSON 400; health reports ai status', async () => {
        const nf = await call('GET', '/nope', { token: tokens.admin }); assert.equal(nf.status, 404); assert.equal(nf.body.errorCode, 'ROUTE_NOT_FOUND');
        assert.equal((await call('POST', '/auth/login', { body: '{bad json' })).status, 400);
        const h = await call('GET', '/health'); assert.equal(h.body.db, 'up');
    });
});
