const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({stack: true}),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'api-gateway' },
    transports: [
        // Console output with colorized text for dev/debug
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        // Log only 'error' level logs to error.log
        new winston.transports.File({filename: 'error.log', level: 'error'}),
        // Log all levels to combined.log
        new winston.transports.File({filename: 'combined.log'})
    ],
});

module.exports = logger;