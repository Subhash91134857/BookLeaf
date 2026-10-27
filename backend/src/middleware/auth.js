const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

const authenticate = (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return next(AppError.unauthorized());
    try {
        const p = jwt.verify(token, config.jwt.secret);
        req.user = { id: p.sub, role: p.role };
        return next();
    } catch (err) {
        return next(err); // JsonWebToken/TokenExpired errors are mapped to 401s centrally
    }
};

const authorize = (...roles) => (req, res, next) => (roles.includes(req.user.role) ? next() : next(AppError.forbidden()));

module.exports = { authenticate, authorize };
