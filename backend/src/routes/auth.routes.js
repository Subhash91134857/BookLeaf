const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('../controller/AuthController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const schemas = require('../validators/schemas');


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 30,
    message: { isSuccess: false, status: 'fail', message: 'Too many sign-in attempts. Try again in a few minutes.', errorCode: 'RATE_LIMITED' },
});

router.post('/login', loginLimiter, validate(schemas.login), controller.login);
router.get('/me', authenticate, controller.me);
module.exports = router;
