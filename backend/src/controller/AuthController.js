const BaseController = require('./BaseController');
const AuthService = require('../services/AuthService');

class AuthController extends BaseController {
    login = this.asyncWrapper(async (req) => ({ data: await AuthService.login(req.valid.body), message: 'Signed in' }));
    me = this.asyncWrapper(async (req) => ({ data: await AuthService.me(req.user.id) }));
}
module.exports = new AuthController();
