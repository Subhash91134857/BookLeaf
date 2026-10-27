// In-browser fake backend, active only when VITE_USE_MOCK=true.
// Implements the same contract as README.md so the UI can be exercised without a server.
// State persists in localStorage (shared across tabs) and is re-read on every request,
// so an admin reply made in one tab shows up in the author's tab via normal polling.
import seedData from './bookleaf_sample_data.json';

const KEY = 'bookleaf_mock_db';
const AUTHOR_PASSWORD = 'password123';
const ADMINS = [
  { id: 'ADM001', name: 'Asha Verma', email: 'admin@bookleaf.com', password: 'admin123', role: 'admin' },
  { id: 'ADM002', name: 'Rahul Singh', email: 'ops@bookleaf.com', password: 'admin123', role: 'admin' },
];
const authors = seedData.authors.map((a) => ({ id: a.author_id, name: a.name, email: a.email, role: 'author', password: AUTHOR_PASSWORD, books: a.books }));
const users = [...ADMINS, ...authors];
const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });
const allBooks = authors.flatMap((a) => a.books.map((b) => ({ ...b, authorId: a.id })));

const toBook = (b) => ({
  bookId: b.book_id, title: b.title, isbn: b.isbn, genre: b.genre, publicationDate: b.publication_date, status: b.status,
  mrp: b.mrp, totalCopiesSold: b.total_copies_sold, totalRoyaltyEarned: b.total_royalty_earned,
  royaltyPaid: b.royalty_paid, royaltyPending: b.royalty_pending,
});

// ---------- db ----------
const hrs = (h) => new Date(Date.now() - h * 36e5).toISOString();
function seed() {
  const T = (id, authorId, bookId, subject, description, category, priority, status, h, extra = {}) => ({
    id, authorId, bookId, subject, description, category, categorySource: 'ai', priority, prioritySource: 'ai', status,
    assigneeId: null, createdAt: hrs(h), updatedAt: hrs(h), messages: [], notes: [], aiDraft: '', ...extra,
  });
  return { seq: 100, tickets: [
    T('T-001', 'AUTH003', 'BK005', "I haven't received any royalty for 6 months", 'My book Between Two Temples has been live since July 2024 and I have not received a single royalty payment. What is going on?', 'Royalty & Payments', 'critical', 'open', 80),
    T('T-002', 'AUTH006', 'BK010', 'Royalty amount seems too low', 'I sold 88 copies of Turban Tales. How is my royalty calculated? It feels too low.', 'Royalty & Payments', 'medium', 'in_progress', 30, { assigneeId: 'ADM001', notes: [{ id: 'N-1', body: 'Pull the platform-wise breakdown before replying.', adminName: 'Asha Verma', createdAt: hrs(20) }] }),
    T('T-003', 'AUTH001', 'BK001', 'Different ISBN on Amazon vs physical copy', 'The ISBN on Amazon does not match the one printed on my author copy of Whispers of the Ganges.', 'ISBN & Metadata Issues', 'high', 'open', 5),
    T('T-004', 'AUTH004', 'BK006', 'Print quality is poor', 'My author copies of Debugging Life arrived with blurry images and misaligned pages.', 'Printing & Quality', 'high', 'resolved', 100, {
      assigneeId: 'ADM002', updatedAt: hrs(60),
      messages: [{ id: 'M-1', sender: 'admin', senderName: 'Rahul Singh', body: 'Hi Vikram,\n\nI am sorry about the print quality. Please share photos of the affected pages and we will arrange a free reprint once verified. Reprints take 5–7 business days.\n\nWarm regards,\nBookLeaf Author Support', createdAt: hrs(60) }] }),
    T('T-005', 'AUTH007', 'BK013', 'When will Midnight in Mysore be ready?', 'It has been a while since the cover design stage. Could you tell me the timeline?', 'Book Status & Production Updates', 'medium', 'open', 2),
    T('T-006', 'AUTH002', 'BK003', 'Showing as Currently Unavailable on Amazon', 'Code & Karma shows "Currently Unavailable" on Amazon India since yesterday.', 'Distribution & Availability', 'high', 'in_progress', 26, { assigneeId: 'ADM001' }),
    T('T-007', 'AUTH009', null, 'Can I update my author bio?', 'Is it possible to update my author bio after publication?', 'General Inquiry', 'low', 'closed', 200, { prioritySource: 'default' }),
  ] };
}
const load = () => {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* fall through */ }
  const d = seed(); localStorage.setItem(KEY, JSON.stringify(d)); return d;
};
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
if (typeof window !== 'undefined') {
  window.resetMock = () => { localStorage.removeItem(KEY); location.reload(); };   // wipe tickets back to seed data
  window.mockAiDown = (down = true) => { sessionStorage.setItem('mock_ai_down', down ? '1' : ''); }; // simulate AI outage
}

// ---------- fake "AI" ----------
function classify(text) {
  const t = text.toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  let category = 'General Inquiry';
  if (has('royalt', 'payout', 'payment', 'paid')) category = 'Royalty & Payments';
  else if (has('isbn', 'metadata')) category = 'ISBN & Metadata Issues';
  else if (has('print', 'blurry', 'binding', 'misprint', 'reprint', 'quality')) category = 'Printing & Quality';
  else if (has('amazon', 'flipkart', 'unavailable', 'listing', 'stock')) category = 'Distribution & Availability';
  else if (has('typesetting', 'cover', 'proof', 'production', 'when will')) category = 'Book Status & Production Updates';
  let priority = 'medium';
  if (has("haven't received", 'not received', 'no royalty', 'different isbn', 'duplicate isbn', 'wrong isbn')) priority = 'critical';
  else if (['ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability'].includes(category)) priority = 'high';
  else if (category === 'General Inquiry') priority = 'low';
  return { category, priority };
}
function buildDraft(t, author, book) {
  const first = author.name.split(' ')[0];
  const bodies = {
    'Royalty & Payments': book
      ? `Thank you for raising this, and I understand the concern. For "${book.title}", ${book.total_copies_sold} copies have sold, earning ₹${book.total_royalty_earned}; ₹${book.royalty_paid} has been paid and ₹${book.royalty_pending} is pending. Royalties are calculated quarterly and paid within 45 days of quarter end (80% of net profit, minimum payout ₹1,000). ${book.royalty_paid === 0 ? 'No payout has been made on this title yet, so I am escalating this to our finance team.' : ''} Our team will confirm the exact payout date and share a line-by-line breakdown within 48 hours.`
      : 'Thank you for reaching out. Royalties are calculated quarterly and paid within 45 days of quarter end. Our team will review your account and share a detailed breakdown within 48 hours.',
    'ISBN & Metadata Issues': 'This is a serious data issue and I am sorry for the confusion. I am escalating it to our production team right away; ISBN errors are treated as high priority. You will have a resolution update within 48 hours.',
    'Printing & Quality': 'I am sincerely sorry about the quality of your copies. Could you share photos of the defective pages? Once verified, we will arrange a free reprint, which takes 5–7 business days.',
    'Distribution & Availability': 'Thanks for flagging this. A "Currently Unavailable" label is usually a stock sync issue. I am asking our distribution team to trigger a re-sync, and the book should be back within 24–48 hours.',
    'Book Status & Production Updates': `${book ? `"${book.title}" is currently at: ${book.status}. ` : ''}Delays usually happen at cover design and proofreading while we wait for approvals. We will email you the next steps and a specific updated timeline within 48 hours.`,
    'General Inquiry': 'Yes, metadata updates can be submitted through your dashboard or by emailing our team. Changes typically reflect on platforms within 3–5 business days.',
  };
  return `Hi ${first},\n\n${bodies[t.category]}\n\nWarm regards,\nBookLeaf Author Support`;
}

// ---------- helpers ----------
const res = (status, data = null) => ({ status, data });
const fail = (status, message, details) => res(status, { error: { message, details } });
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const CATS = ['Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry'];

function view(t, user) {
  const a = authors.find((x) => x.id === t.authorId);
  const b = allBooks.find((x) => x.book_id === t.bookId);
  const asg = users.find((x) => x.id === t.assigneeId);
  const out = {
    id: t.id, subject: t.subject, description: t.description, status: t.status,
    category: t.category, categorySource: t.categorySource, priority: t.priority, prioritySource: t.prioritySource,
    book: b ? { bookId: b.book_id, title: b.title } : null,
    author: { id: a.id, name: a.name, email: a.email },
    assignee: asg ? { id: asg.id, name: asg.name } : null,
    createdAt: t.createdAt, updatedAt: t.updatedAt, messages: t.messages,
  };
  return user.role === 'admin' ? { ...out, notes: t.notes, aiDraft: t.aiDraft } : out;
}

// ---------- router ----------
export async function handleMock({ method, path, body = {}, params = {}, token }) {
  await new Promise((r) => setTimeout(r, path.endsWith('/draft') ? 900 : 200));

  if (method === 'POST' && path === '/auth/login') {
    const u = users.find((x) => x.email.toLowerCase() === String(body.email || '').toLowerCase() && x.password === body.password);
    return u ? res(200, { token: `mock-${u.id}`, user: publicUser(u) }) : fail(401, 'Invalid email or password.');
  }
  const me = users.find((u) => `mock-${u.id}` === token);
  if (!me) return fail(401, 'Authentication required.');
  if (method === 'GET' && path === '/auth/me') return res(200, publicUser(me));

  if (method === 'GET' && path === '/books') {
    return me.role === 'admin' ? fail(403, 'Admins do not have a books list.') : res(200, me.books.map(toBook));
  }

  const db = load();
  const isAdmin = me.role === 'admin';

  if (path === '/tickets' && method === 'GET') {
    let list = db.tickets.filter((t) => isAdmin || t.authorId === me.id);
    if (params.status) list = list.filter((t) => t.status === params.status);
    if (params.category) list = list.filter((t) => t.category === params.category);
    if (params.priority) list = list.filter((t) => t.priority === params.priority);
    if (params.assignee === 'me') list = list.filter((t) => t.assigneeId === me.id);
    if (params.assignee === 'unassigned') list = list.filter((t) => !t.assigneeId);
    if (params.from) list = list.filter((t) => t.createdAt.slice(0, 10) >= params.from);
    if (params.to) list = list.filter((t) => t.createdAt.slice(0, 10) <= params.to);
    const done = (t) => ['resolved', 'closed'].includes(t.status);
    list.sort((a, b) => params.sort === 'urgency'
      ? (done(a) - done(b)) || (RANK[a.priority] - RANK[b.priority]) || (new Date(a.createdAt) - new Date(b.createdAt))
      : new Date(b.createdAt) - new Date(a.createdAt));
    const pageSize = Number(params.pageSize) || 20; const page = Number(params.page) || 1;
    return res(200, { items: list.slice((page - 1) * pageSize, page * pageSize).map((t) => view(t, me)), total: list.length, page, pageSize });
  }

  if (path === '/tickets' && method === 'POST') {
    if (isAdmin) return fail(403, 'Only authors can create tickets.');
    const details = {};
    if (String(body.subject || '').trim().length < 3) details.subject = 'Subject must be at least 3 characters.';
    if (String(body.description || '').trim().length < 10) details.description = 'Description must be at least 10 characters.';
    if (body.bookId && !me.books.some((b) => b.book_id === body.bookId)) details.bookId = 'Unknown book.';
    if (Object.keys(details).length) return fail(422, 'Please fix the highlighted fields.', details);
    const { category, priority } = classify(`${body.subject} ${body.description}`);
    const now = new Date().toISOString();
    const t = { id: `T-${++db.seq}`, authorId: me.id, bookId: body.bookId || null, subject: body.subject.trim(), description: body.description.trim(),
      category, categorySource: 'ai', priority, prioritySource: 'ai', status: 'open', assigneeId: null, createdAt: now, updatedAt: now, messages: [], notes: [], aiDraft: '' };
    db.tickets.push(t); save(db);
    return res(201, view(t, me));
  }

  const m = path.match(/^\/tickets\/([^/]+)(?:\/(messages|notes|draft))?$/);
  if (!m) return fail(404, 'Route not found.');
  const t = db.tickets.find((x) => x.id === m[1]);
  if (!t || (!isAdmin && t.authorId !== me.id)) return fail(404, 'Ticket not found.');
  const sub = m[2];

  if (!sub && method === 'GET') return res(200, view(t, me));
  if (!isAdmin) return fail(403, 'Admin access required.');

  if (!sub && method === 'PATCH') {
    const details = {};
    if ('status' in body && !STATUSES.includes(body.status)) details.status = 'Invalid status.';
    if ('priority' in body && !(body.priority in RANK)) details.priority = 'Invalid priority.';
    if ('category' in body && !CATS.includes(body.category)) details.category = 'Invalid category.';
    if (Object.keys(details).length) return fail(422, 'Invalid values.', details);
    if ('status' in body) t.status = body.status;
    if ('category' in body) { t.category = body.category; t.categorySource = 'admin'; }
    if ('priority' in body) { t.priority = body.priority; t.prioritySource = 'admin'; }
    if ('assigneeId' in body) t.assigneeId = body.assigneeId;
    t.updatedAt = new Date().toISOString(); save(db);
    return res(200, view(t, me));
  }
  if (sub === 'messages' && method === 'POST') {
    if (!String(body.body || '').trim()) return fail(422, 'Reply cannot be empty.', { body: 'Reply cannot be empty.' });
    const msg = { id: `M-${Date.now()}`, sender: 'admin', senderName: me.name, body: body.body.trim(), createdAt: new Date().toISOString() };
    t.messages.push(msg); t.aiDraft = ''; t.updatedAt = msg.createdAt; save(db);
    return res(201, msg);
  }
  if (sub === 'notes' && method === 'POST') {
    if (!String(body.body || '').trim()) return fail(422, 'Note cannot be empty.');
    const note = { id: `N-${Date.now()}`, body: body.body.trim(), adminName: me.name, createdAt: new Date().toISOString() };
    t.notes.push(note); save(db);
    return res(201, note);
  }
  if (sub === 'draft' && method === 'POST') {
    if (sessionStorage.getItem('mock_ai_down')) return fail(503, 'AI service unavailable.');
    const author = authors.find((a) => a.id === t.authorId);
    return res(200, { draft: buildDraft(t, author, allBooks.find((b) => b.book_id === t.bookId)) });
  }
  return fail(405, 'Method not allowed.');
}
