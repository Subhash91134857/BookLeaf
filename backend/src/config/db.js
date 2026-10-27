const { Pool, types } = require('pg');
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, parseFloat);
const logger = require('../utils/logger');
const { gEnv } = require('../utils/env');

const pool = new Pool({
    user: gEnv('DB_USER', 'postgres'),
    host: gEnv('DB_HOST', 'localhost'),
    database: gEnv('DB_NAME', 'postgres'),
    password: gEnv('DB_PASSWORD', 'your_password'),
    port: gEnv('DB_PORT', 5432),
    ssl: gEnv('DB_SSL', 'false') === 'true' ? { rejectUnauthorized: false } : undefined, // hosted Postgres (Render, Neon...)
});

const query = (text, params) => pool.query(text, params);
const withTransaction = async (fn) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const connectToDB = async () => {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        logger.info(`Connected to PostgreSQL at ${res.rows[0].now}`);
        client.release();
    } catch (err) {
        logger.error('PostgreSQL connection error:', err);
        process.exit(1);
    }
};

module.exports = { pool, query, withTransaction, connectToDB };
