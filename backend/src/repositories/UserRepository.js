const { query } = require('../config/db');

module.exports = {
    findByEmail: async (email) => (await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email])).rows[0],
    findById: async (id) => (await query('SELECT * FROM users WHERE id = $1', [id])).rows[0],
    isAdmin: async (id) => (await query("SELECT 1 FROM users WHERE id = $1 AND role = 'admin'", [id])).rowCount > 0,
};
