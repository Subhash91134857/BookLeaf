const { query } = require('../config/db');
const ai = require('../services/ai/provider');

module.exports = (app) => {
    app.get('/api/v1/health', async (req, res) => {
        let db = 'up';
        try { await query('SELECT 1'); } catch { db = 'down'; }
        res.status(db === 'up' ? 200 : 503).json({ status: db === 'up' ? 'ok' : 'degraded', db, ai: { configured: ai.isConfigured(), available: ai.isAvailable() } });
    });
    app.use('/api/v1/auth', require('./auth.routes'));
    app.use('/api/v1/books', require('./book.routes'));
    app.use('/api/v1/tickets', require('./ticket.routes'));
};
