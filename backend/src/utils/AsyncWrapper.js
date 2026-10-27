const Response = require('./Response_handler');
const AppError = require('./AppError');

module.exports = (fn) => async (req, res, next) => {
    try {
        const result = await fn(req, res, next);
        if (res.headersSent) return;
        const { data, statusCode = 200, message = 'Request successful' } = result || {};
        if (data === undefined || data === null) {
            throw new AppError('API execution failed: no data returned', 500, false, 'API_EMPTY_RESPONSE');
        }
        Response.sendSuccess(res, data, statusCode, message);
    } catch (err) {
        next(err);
    }
};
