// DB row -> API shape (camelCase, matches the frontend contract). Admin-only fields are added by role.
const bookView = (r) => ({
    bookId: r.book_id, title: r.title, isbn: r.isbn, genre: r.genre, publicationDate: r.publication_date, status: r.status,
    mrp: r.mrp, totalCopiesSold: r.total_copies_sold, totalRoyaltyEarned: r.total_royalty_earned,
    royaltyPaid: r.royalty_paid, royaltyPending: r.royalty_pending,
    lastRoyaltyPayoutDate: r.last_royalty_payout_date, printPartner: r.print_partner, availableOn: r.available_on,
});

const messageView = (m) => ({ id: m.id, sender: m.sender_role, senderName: m.sender_name, body: m.body, createdAt: m.created_at });
const noteView = (n) => ({ id: n.id, body: n.body, adminName: n.admin_name, createdAt: n.created_at });

const ticketView = (r, { messages, notes, isAdmin = false } = {}) => ({
    id: r.id,
    subject: r.subject,
    description: r.description,
    status: r.status,
    category: r.category, categorySource: r.category_source,
    priority: r.priority, prioritySource: r.priority_source,
    book: r.book_id ? { bookId: r.book_id, title: r.book_title } : null,
    author: { id: r.author_id, name: r.author_name, email: r.author_email },
    assignee: r.assignee_id ? { id: r.assignee_id, name: r.assignee_name } : null,
    createdAt: r.created_at, updatedAt: r.updated_at,
    ...(messages && { messages: messages.map(messageView) }),
    ...(isAdmin && notes && { notes: notes.map(noteView) }),
    ...(isAdmin && { aiDraft: r.ai_draft || '' }), // internal: never exposed to authors
});

module.exports = { bookView, ticketView, messageView };
