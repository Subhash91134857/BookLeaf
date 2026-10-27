const fs = require('fs');
const { createLogger, format, transports } = require('winston');

// Ensure logs directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'bookleaf-backend' }, // Customize service name
    transports: [
        // Console for dev
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        }),

        // File for error logs
        new transports.File({ filename: `${logDir}/error.log`, level: 'error' }),

        // File for all logs
        new transports.File({ filename: `${logDir}/combined.log` })
    ]
});

module.exports = logger;
