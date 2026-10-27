const { query, withTransaction } = require('../config/db');

const BASE = `
  SELECT t.*, a.name AS author_name, a.email AS author_email, b.title AS book_title, s.name AS assignee_name
  FROM tickets t
  JOIN users a ON a.id = t.author_id
  LEFT JOIN books b ON b.book_id = t.book_id
  LEFT JOIN users s ON s.id = t.assignee_id`;

// Open tickets first, then by priority, then oldest first => "most urgent and oldest" surfaces on top.
const URGENCY = `(t.status IN ('resolved','closed')) ASC,
  CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC,
  t.created_at ASC`;

// Whitelisted columns that PATCH may set (keys are our own, never user input => safe to interpolate).
const UPDATABLE = ['status', 'category', 'category_source', 'priority', 'priority_source', 'assignee_id'];

module.exports = {
    async list({ authorId, status, category, priority, assignee, viewerId, from, to, sort, page, pageSize }) {
        const where = []; const p = [];
        const add = (sql, val) => { p.push(val); where.push(sql.replace('?', `$${p.length}`)); };
        if (authorId) add('t.author_id = ?', authorId);
        if (status) add('t.status = ?', status);
        if (category) add('t.category = ?', category);
        if (priority) add('t.priority = ?', priority);
        if (assignee === 'me') add('t.assignee_id = ?', viewerId);
        else if (assignee === 'unassigned') where.push('t.assignee_id IS NULL');
        else if (assignee) add('t.assignee_id = ?', assignee);
        if (from) add('t.created_at >= ?::date', from);
        if (to) add('t.created_at < (?::date + 1)', to);
        const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const order = sort === 'urgency' ? URGENCY : 't.created_at DESC';

        const total = (await query(`SELECT COUNT(*)::int AS n FROM tickets t ${w}`, p)).rows[0].n;
        const rows = (await query(`${BASE} ${w} ORDER BY ${order} LIMIT $${p.length + 1} OFFSET $${p.length + 2}`, [...p, pageSize, (page - 1) * pageSize])).rows;
        return { rows, total };
    },

    findById: async (id) => (await query(`${BASE} WHERE t.id = $1`, [id])).rows[0],

    // One query for many tickets (avoids N+1 on list views).
    messagesFor: async (ticketIds) => (await query(
        `SELECT m.*, u.name AS sender_name FROM ticket_messages m JOIN users u ON u.id = m.sender_id
         WHERE m.ticket_id = ANY($1::uuid[]) ORDER BY m.created_at`, [ticketIds])).rows,
    notesFor: async (ticketId) => (await query(
        `SELECT n.*, u.name AS admin_name FROM ticket_notes n JOIN users u ON u.id = n.admin_id
         WHERE n.ticket_id = $1 ORDER BY n.created_at`, [ticketId])).rows,

    create: async ({ authorId, bookId, subject, description }) => (await query(
        'INSERT INTO tickets (author_id, book_id, subject, description) VALUES ($1,$2,$3,$4) RETURNING id',
        [authorId, bookId, subject, description])).rows[0].id,

    async update(id, fields) {
        const keys = Object.keys(fields).filter((k) => UPDATABLE.includes(k));
        const sets = keys.map((k, i) => `${k} = $${i + 2}`);
        await query(`UPDATE tickets SET ${[...sets, 'updated_at = NOW()'].join(', ')} WHERE id = $1`, [id, ...keys.map((k) => fields[k])]);
    },

    // AI results never overwrite a value an admin has already set (source != 'default').
    setClassification: (id, { category, priority, source }) => query(
        `UPDATE tickets SET
           category = CASE WHEN category_source = 'default' THEN $2 ELSE category END,
           category_source = CASE WHEN category_source = 'default' THEN $4 ELSE category_source END,
           priority = CASE WHEN priority_source = 'default' THEN $3 ELSE priority END,
           priority_source = CASE WHEN priority_source = 'default' THEN $4 ELSE priority_source END,
           updated_at = NOW()
         WHERE id = $1`, [id, category, priority, source]),

    setDraft: (id, draft) => query('UPDATE tickets SET ai_draft = $2 WHERE id = $1', [id, draft]),

    // Sending a reply: store message, clear cached draft, and move open -> in_progress, atomically.
    addAdminReply: (ticketId, adminId, body) => withTransaction(async (c) => {
        const m = (await c.query(
            "INSERT INTO ticket_messages (ticket_id, sender_role, sender_id, body) VALUES ($1,'admin',$2,$3) RETURNING id", [ticketId, adminId, body])).rows[0];
        await c.query(
            "UPDATE tickets SET ai_draft = NULL, updated_at = NOW(), status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END WHERE id = $1", [ticketId]);
        return m.id;
    }),

    addNote: async (ticketId, adminId, body) => (await query(
        'INSERT INTO ticket_notes (ticket_id, admin_id, body) VALUES ($1,$2,$3) RETURNING id', [ticketId, adminId, body])).rows[0].id,
};
