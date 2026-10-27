const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('../controller/TicketController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const schemas = require('../validators/schemas');

// AI calls cost money: cap per admin user.
const draftLimiter = rateLimit({
    windowMs: 60 * 1000, max: 20, keyGenerator: (req) => req.user.id,
    message: { isSuccess: false, status: 'fail', message: 'Too many draft requests. Wait a minute and retry.', errorCode: 'RATE_LIMITED' },
});

router.use(authenticate); // every ticket route requires a valid token

router.get('/', validate(schemas.listTickets), controller.list);                                   // author: own, admin: all
router.post('/', authorize('author'), validate(schemas.createTicket), controller.create);
router.get('/:id', validate(schemas.ticketId), controller.get);
router.patch('/:id', authorize('admin'), validate(schemas.updateTicket), controller.update);
router.post('/:id/messages', authorize('admin'), validate(schemas.textBody), controller.reply);
router.post('/:id/notes', authorize('admin'), validate(schemas.textBody), controller.addNote);
router.post('/:id/draft', authorize('admin'), draftLimiter, validate(schemas.ticketId), controller.draft);

module.exports = router;
