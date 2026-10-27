
const bcrypt = require('bcryptjs');
const data = require('./data/bookleaf_sample_data.json');
const { pool, withTransaction } = require('../config/db');
const { gEnv } = require('../utils/env');
const logger = require('../utils/logger');

const AUTHOR_PASSWORD = gEnv('SEED_AUTHOR_PASSWORD', 'password123');
const ADMIN_PASSWORD = gEnv('SEED_ADMIN_PASSWORD', 'admin123');
const ADMINS = [
    { id: 'ADM001', name: 'Asha Verma', email: 'admin@bookleaf.com' },
    { id: 'ADM002', name: 'Rahul Singh', email: 'ops@bookleaf.com' },
];

// [id-suffix, authorId, bookId, subject, description, category, priority, status, hoursAgo, assigneeId, messages, notes]
const DEMO_TICKETS = [
    ['AUTH003', 'BK005', "I haven't received any royalty for 6 months", 'My book Between Two Temples has been live since July 2024 and I have not received a single royalty payment. What is going on?', 'Royalty & Payments', 'critical', 'open', 80, null, [], []],
    ['AUTH006', 'BK010', 'Royalty amount seems too low', 'I sold 88 copies of Turban Tales. How is my royalty calculated? It feels too low.', 'Royalty & Payments', 'medium', 'in_progress', 30, 'ADM001', [], ['Pull the platform-wise breakdown before replying.']],
    ['AUTH001', 'BK001', 'Different ISBN on Amazon vs physical copy', 'The ISBN on Amazon does not match the one printed on my author copy of Whispers of the Ganges.', 'ISBN & Metadata Issues', 'high', 'open', 5, null, [], []],
    ['AUTH004', 'BK006', 'Print quality is poor', 'My author copies of Debugging Life arrived with blurry images and misaligned pages.', 'Printing & Quality', 'high', 'resolved', 100, 'ADM002',
        ['Hi Vikram,\n\nI am sorry about the print quality. Please share photos of the affected pages and we will arrange a free reprint once verified. Reprints take 5-7 business days.\n\nWarm regards,\nBookLeaf Author Support'], []],
    ['AUTH007', 'BK013', 'When will Midnight in Mysore be ready?', 'It has been a while since the cover design stage. Could you tell me the timeline?', 'Book Status & Production Updates', 'medium', 'open', 2, null, [], []],
    ['AUTH002', 'BK003', 'Showing as Currently Unavailable on Amazon', 'Code & Karma shows "Currently Unavailable" on Amazon India since yesterday.', 'Distribution & Availability', 'high', 'in_progress', 26, 'ADM001', [], []],
    ['AUTH009', null, 'Can I update my author bio?', 'Is it possible to update my author bio after publication?', 'General Inquiry', 'low', 'closed', 200, null, [], []],
];

const seed = async ({ withTickets = true } = {}) => {
    const authorHash = await bcrypt.hash(AUTHOR_PASSWORD, 10);
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await withTransaction(async (c) => {
        const upsertUser = (u, role, hash) => c.query(
            `INSERT INTO users (id, name, email, password_hash, role, phone, city, joined_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, city = EXCLUDED.city`,
            [u.id, u.name, u.email, hash, role, u.phone || null, u.city || null, u.joined_date || null]);

        for (const a of ADMINS) await upsertUser(a, 'admin', adminHash);
        for (const a of data.authors) {
            await upsertUser({ ...a, id: a.author_id }, 'author', authorHash);
            for (const b of a.books) {
                await c.query(
                    `INSERT INTO books (book_id, author_id, title, isbn, genre, publication_date, status, mrp, author_royalty_per_copy, total_copies_sold,
                       total_royalty_earned, royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
                     ON CONFLICT (book_id) DO UPDATE SET status = EXCLUDED.status, total_copies_sold = EXCLUDED.total_copies_sold,
                       total_royalty_earned = EXCLUDED.total_royalty_earned, royalty_paid = EXCLUDED.royalty_paid, royalty_pending = EXCLUDED.royalty_pending`,
                    [b.book_id, a.author_id, b.title, b.isbn, b.genre, b.publication_date, b.status, b.mrp, b.author_royalty_per_copy, b.total_copies_sold,
                        b.total_royalty_earned, b.royalty_paid, b.royalty_pending, b.last_royalty_payout_date, b.print_partner, b.available_on]);
            }
        }

        const existing = (await c.query('SELECT COUNT(*)::int AS n FROM tickets')).rows[0].n;
        if (withTickets && existing === 0) {
            for (const [authorId, bookId, subject, description, category, priority, status, hours, assignee, messages, notes] of DEMO_TICKETS) {
                const t = (await c.query(
                    `INSERT INTO tickets (author_id, book_id, subject, description, status, category, category_source, priority, priority_source, assignee_id, created_at, updated_at)
                     VALUES ($1,$2,$3,$4,$5,$6,'ai',$7,'ai',$8, NOW() - make_interval(hours => $9), NOW() - make_interval(hours => $9)) RETURNING id`,
                    [authorId, bookId, subject, description, status, category, priority, assignee, hours])).rows[0];
                for (const m of messages) await c.query("INSERT INTO ticket_messages (ticket_id, sender_role, sender_id, body, created_at) VALUES ($1,'admin',$2,$3, NOW() - interval '60 hours')", [t.id, assignee, m]);
                for (const n of notes) await c.query("INSERT INTO ticket_notes (ticket_id, admin_id, body, created_at) VALUES ($1,$2,$3, NOW() - interval '20 hours')", [t.id, assignee, n]);
            }
        }
    });
    logger.info(`🌱 Seeded ${data.authors.length} authors, ${data.authors.reduce((n, a) => n + a.books.length, 0)} books, ${ADMINS.length} admins`);
};

module.exports = { seed };
if (require.main === module) seed().then(() => pool.end()).catch((e) => { logger.error(e); process.exit(1); });
