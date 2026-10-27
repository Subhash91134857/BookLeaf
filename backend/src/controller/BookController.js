const BaseController = require('./BaseController');
const BookService = require('../services/BookService');

class BookController extends BaseController {
    list = this.asyncWrapper(async (req) => ({ data: await BookService.list(req.user) }));
}
module.exports = new BookController();
