const { z } = require('zod');
const { CATEGORIES, PRIORITIES, STATUSES } = require('../utils/constants');

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');
const text = (label, min, max) => z.string({ required_error: `${label} is required.` }).trim()
    .min(min, `${label} must be at least ${min} characters.`).max(max, `${label} must be at most ${max} characters.`);

exports.login = { body: z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email.'), password: z.string().min(1, 'Password is required.').max(200) }) };

exports.ticketId = { params: z.object({ id: z.string().uuid('Invalid ticket id.') }) };

exports.listTickets = {
    query: z.object({
        status: z.enum(STATUSES).optional(), category: z.enum(CATEGORIES).optional(), priority: z.enum(PRIORITIES).optional(),
        assignee: z.string().max(64).optional(), from: date.optional(), to: date.optional(),
        sort: z.enum(['urgency', 'newest']).default('newest'),
        page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
        include: z.enum(['messages']).optional(),
    }),
};

exports.createTicket = {
    body: z.object({
        bookId: z.string().min(1).max(32).nullable().optional(), // null/omitted = General / Account level
        subject: text('Subject', 3, 120),
        description: text('Description', 10, 5000),
    }),
};

exports.updateTicket = {
    ...exports.ticketId,
    body: z.object({
        status: z.enum(STATUSES), category: z.enum(CATEGORIES), priority: z.enum(PRIORITIES),
        assigneeId: z.string().min(1).max(64).nullable(),
    }).partial().refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update.' }),
};

exports.textBody = { ...exports.ticketId, body: z.object({ body: text('Message', 1, 5000) }) };
