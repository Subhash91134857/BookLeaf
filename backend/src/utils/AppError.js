class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, errorCode = 'UNKNOWN_ERROR', details = undefined) {
        super(message);
        this.statusCode = statusCode;
        this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;
        this.errorCode = errorCode;
        this.details = details; // { field: 'message' } for validation errors
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
    static validation(details, message = 'Please fix the highlighted fields.') { return new AppError(message, 422, true, 'VALIDATION_ERROR', details); }
    static badRequest(message, code = 'BAD_REQUEST') { return new AppError(message, 400, true, code); }
    static unauthorized(message = 'Authentication required.', code = 'UNAUTHORIZED') { return new AppError(message, 401, true, code); }
    static forbidden(message = 'You do not have access to this resource.') { return new AppError(message, 403, true, 'FORBIDDEN'); }
    static notFound(message = 'Resource not found.') { return new AppError(message, 404, true, 'NOT_FOUND'); }
    static unavailable(message, code = 'SERVICE_UNAVAILABLE') { return new AppError(message, 503, true, code); }
}
module.exports = AppError;
