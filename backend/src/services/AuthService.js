const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const users = require('../repositories/UserRepository');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
// Security Vulnerability mitigation: Use a dummy hash for password comparison when the email is unknown. This prevents timing attacks that could reveal whether an email exists in the system based on response time.
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

module.exports = {
    async login({ email, password }) {
        const user = await users.findByEmail(email);
        const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
        if (!user || !ok) throw AppError.unauthorized('Email or password is incorrect.', 'INVALID_CREDENTIALS');
        const token = jwt.sign({ role: user.role }, config.jwt.secret, { subject: user.id, expiresIn: config.jwt.expiresIn });
        return { token, user: publicUser(user) };
    },
    async me(userId) {
        const user = await users.findById(userId);
        if (!user) throw AppError.unauthorized('Account no longer exists.', 'INVALID_TOKEN');
        return publicUser(user);
    },
};
