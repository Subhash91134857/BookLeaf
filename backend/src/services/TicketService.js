const AppError = require('../utils/AppError');
const tickets = require('../repositories/TicketRepository');
const books = require('../repositories/BookRepository');
const users = require('../repositories/UserRepository');
const TicketAiService = require('./TicketAiService');
const { ticketView } = require('../utils/serializers');
const logger = require('../utils/logger');

const isAdmin = (user) => user.role === 'admin';

// Authors can only ever load their own tickets; someone else's id looks like "not found" (no existence leak).
async function load(user, id) {
    const t = await tickets.findById(id);
    if (!t || (!isAdmin(user) && t.author_id !== user.id)) throw AppError.notFound('Ticket not found.');
    return t;
}

const TicketService = {
    async list(user, q) {
        const { rows, total } = await tickets.list({
            ...q, viewerId: user.id,
            authorId: isAdmin(user) ? undefined : user.id,
            assignee: isAdmin(user) ? q.assignee : undefined,
        });
        let grouped = null;
        if (q.include === 'messages' && rows.length) { // one query for the whole page
            grouped = {};
            for (const m of await tickets.messagesFor(rows.map((r) => r.id))) (grouped[m.ticket_id] ||= []).push(m);
        }
        return {
            items: rows.map((r) => ticketView(r, { messages: grouped ? grouped[r.id] || [] : undefined, isAdmin: isAdmin(user) })),
            total, page: q.page, pageSize: q.pageSize,
        };
    },

    async get(user, id) {
        const t = await load(user, id);
        const messages = await tickets.messagesFor([id]);
        const notes = isAdmin(user) ? await tickets.notesFor(id) : undefined;
        return ticketView(t, { messages, notes, isAdmin: isAdmin(user) });
    },

    async create(user, { bookId, subject, description }) {
        if (bookId && !(await books.findForAuthor(user.id, bookId))) throw AppError.validation({ bookId: 'Select one of your own books.' });
        const id = await tickets.create({ authorId: user.id, bookId: bookId || null, subject, description });
        // Fire-and-forget: classification/priority/draft happen after the response is sent.
        setImmediate(() => TicketAiService.processNewTicket(id).catch((e) => logger.error(e.message)));
        return TicketService.get(user, id);
    },

    // Admin overrides. Changing category/priority marks the source as 'admin' so AI never overwrites it.
    async update(user, id, patch) {
        await load(user, id);
        const f = {};
        if (patch.status) f.status = patch.status;
        if (patch.category) { f.category = patch.category; f.category_source = 'admin'; }
        if (patch.priority) { f.priority = patch.priority; f.priority_source = 'admin'; }
        if ('assigneeId' in patch) {
            if (patch.assigneeId && !(await users.isAdmin(patch.assigneeId))) throw AppError.validation({ assigneeId: 'Assignee must be an admin user.' });
            f.assignee_id = patch.assigneeId;
        }
        await tickets.update(id, f);
        return TicketService.get(user, id);
    },

    async reply(user, id, body) {
        await load(user, id);
        const messageId = await tickets.addAdminReply(id, user.id, body);
        const me = await users.findById(user.id);
        return { id: messageId, sender: 'admin', senderName: me.name, body, createdAt: new Date().toISOString() };
    },

    async addNote(user, id, body) {
        await load(user, id);
        const noteId = await tickets.addNote(id, user.id, body);
        const me = await users.findById(user.id);
        return { id: noteId, body, adminName: me.name, createdAt: new Date().toISOString() };
    },

    async draft(user, id) {
        await load(user, id);
        return { draft: await TicketAiService.generateDraft(id) };
    },
};

module.exports = TicketService;
