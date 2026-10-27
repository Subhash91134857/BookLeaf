const { createServer } = require('http');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const app = require('./src/app');
const { pool, connectToDB } = require('./src/config/db');
const { migrate } = require('./src/db/migrate');
const { seed } = require('./src/db/seed');

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception! Shutting down...', err);
    process.exit(1);
});

const port = config.port;
app.set('port', port);
const server = createServer(app);

const onError = (error) => {
    if (error.syscall !== 'listen') throw error;
    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;
    switch (error.code) {
        case 'EACCES':
            logger.error(`${bind} requires elevated privileges`);
            process.exit(1);
        case 'EADDRINUSE':
            logger.error(`${bind} is already in use`);
            process.exit(1);
        default:
            throw error;
    }
};

const onListening = () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    logger.info(`🚀 Server is running on ${bind}`);
};

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection! Shutting down...', err);
    server.close(() => process.exit(1));
});

// Graceful shutdown (Render/Docker send SIGTERM)
const shutdown = () => server.close(async () => { await pool.end(); process.exit(0); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const start = async () => {
    await connectToDB(); // DB must be reachable before we accept traffic
    if (config.autoSetup) { // demo-friendly: create schema, and seed only an empty database
        await migrate();
        const { n } = (await pool.query('SELECT COUNT(*)::int AS n FROM users')).rows[0];
        if (n === 0) await seed();
    }
    server.listen(port);
};

server.on('error', onError);
server.on('listening', onListening);

start();
