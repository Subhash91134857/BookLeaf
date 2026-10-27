// Orchestrates AI work for tickets: loads the minimum context from the DB, calls AiService, persists results.
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const ai = require('./ai/AiService');
const tickets = require('../repositories/TicketRepository');
const books = require('../repositories/BookRepository');

// Runs in the background after a ticket is created, so the author's request never waits on the LLM.
async function processNewTicket(ticketId) {
    try {
        const t = await tickets.findById(ticketId);
        if (!t) return;
        const book = t.book_id ? await books.findById(t.book_id) : null;
        const result = await ai.classifyTicket({ subject: t.subject, description: t.description, book });
        await tickets.setClassification(ticketId, result);
        // Pre-generate the draft only if the AI path worked, so the admin sees it immediately on open.
        if (config.ai.pregenerateDraft && result.source === 'ai') await generateDraft(ticketId).catch((e) => logger.warn(`Draft pre-generation skipped: ${e.message}`));
    } catch (err) {
        logger.error(`processNewTicket(${ticketId}) failed: ${err.message}`);
    }
}

// Cost control: ONE category section of the KB + the single relevant book + last 3 messages (not full history).
async function generateDraft(ticketId) {
    if (!ai.isAvailable()) throw AppError.unavailable('The AI draft service is unavailable right now. You can write the reply manually.', 'AI_UNAVAILABLE');
    const t = await tickets.findById(ticketId);
    if (!t) throw AppError.notFound('Ticket not found.');
    const book = t.book_id ? await books.findById(t.book_id) : null;
    const account = book ? null : await books.listByAuthor(t.author_id);
    const messages = (await tickets.messagesFor([ticketId])).slice(-3);
    try {
        const draft = await ai.draftReply({ ticket: t, book, account, messages });
        await tickets.setDraft(ticketId, draft);
        return draft;
    } catch (err) {
        logger.warn(`AI draft failed for ${ticketId}: ${err.code || err.message}`);
        throw AppError.unavailable('The AI draft service is unavailable right now. You can write the reply manually.', 'AI_UNAVAILABLE');
    }
}

module.exports = { processNewTicket, generateDraft };
