const router = require('express').Router();
const controller = require('../controller/BookController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, controller.list);
module.exports = router;
