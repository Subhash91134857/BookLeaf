const AppError = require('./AppError');
const logger = require('./logger');
const { gEnv } = require('./env');

class Response {
    static sendSuccess(res, data, statusCode = 200, message = 'Request successful') {
        return res.status(statusCode).json({ isSuccess: true, status: 'success', message, data });
    }

    static normalize(err) {
        if (err instanceof AppError) return err;
        if (err.name === 'ZodError') {
            const details = {};
            for (const i of err.issues) details[i.path.join('.') || '_'] ||= i.message;
            return AppError.validation(details);
        }
        if (err.name === 'JsonWebTokenError') return AppError.unauthorized('Invalid token. Please sign in again.', 'INVALID_TOKEN');
        if (err.name === 'TokenExpiredError') return AppError.unauthorized('Your session has expired. Please sign in again.', 'EXPIRED_TOKEN');
        if (err.type === 'entity.parse.failed') return AppError.badRequest('Request body is not valid JSON.', 'INVALID_JSON');
        if (err.type === 'entity.too.large') return new AppError('Request body is too large.', 413, true, 'PAYLOAD_TOO_LARGE');
        if (err.code === '23505') return new AppError('A record with these values already exists.', 409, true, 'DUPLICATE_KEY');
        if (err.code === '22P02' || err.code === '23503' || err.code === '23514') return AppError.badRequest('Invalid value supplied.', 'INVALID_VALUE');
        return err;
    }

    static sendError(rawErr, req, res, next) { // eslint-disable-line no-unused-vars
        if (res.headersSent) return next(rawErr);
        const err = Response.normalize(rawErr);
        const operational = err instanceof AppError && err.isOperational;
        const statusCode = operational ? err.statusCode : 500;

        if (!operational) {
            logger.error(`[UnhandledError] ${err.message}`, { stack: err.stack, url: req.originalUrl, method: req.method });
        }
        const isDev = gEnv('NODE_ENV', 'development') === 'development';
        return res.status(statusCode).json({
            isSuccess: false,
            status: String(statusCode).startsWith('4') ? 'fail' : 'error',
            message: operational ? err.message : 'Something went wrong. Please try again later.',
            errorCode: operational ? err.errorCode : 'INTERNAL_SERVER_ERROR',
            ...(operational && err.details && { details: err.details }),
            ...(isDev && !operational && { stack: err.stack }),
        });
    }
}
module.exports = Response;
