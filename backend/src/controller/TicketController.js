const BaseController = require('./BaseController');
const TicketService = require('../services/TicketService');

class TicketController extends BaseController {
    list = this.asyncWrapper(async (req) => ({ data: await TicketService.list(req.user, req.valid.query) }));
    get = this.asyncWrapper(async (req) => ({ data: await TicketService.get(req.user, req.valid.params.id) }));
    create = this.asyncWrapper(async (req) => ({ data: await TicketService.create(req.user, req.valid.body), statusCode: 201, message: 'Ticket created' }));
    update = this.asyncWrapper(async (req) => ({ data: await TicketService.update(req.user, req.valid.params.id, req.valid.body), message: 'Ticket updated' }));
    reply = this.asyncWrapper(async (req) => ({ data: await TicketService.reply(req.user, req.valid.params.id, req.valid.body.body), statusCode: 201, message: 'Reply sent' }));
    addNote = this.asyncWrapper(async (req) => ({ data: await TicketService.addNote(req.user, req.valid.params.id, req.valid.body.body), statusCode: 201, message: 'Note added' }));
    draft = this.asyncWrapper(async (req) => ({ data: await TicketService.draft(req.user, req.valid.params.id) }));
}
module.exports = new TicketController();
