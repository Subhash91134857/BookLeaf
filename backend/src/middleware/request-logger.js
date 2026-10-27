const logger = require('../utils/logger');

const RequestLogger = (req, res, next) => {
    const startHrTime = process.hrtime();
    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(startHrTime);
        const durationInMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

        logger.info(`[${req.method}] ${req.originalUrl} ${res.statusCode} - ${durationInMs} ms`, {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            responseTime: `${durationInMs}ms`,
            ip: req.ip,
        });
    });

    next();
};

module.exports = RequestLogger;
