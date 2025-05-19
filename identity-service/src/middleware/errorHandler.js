const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Log full error stack trace
    logger.error('Error: %s\nStack: %s', err.message, err.stack);

    // Respond with appropriate status and message
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
};

module.exports = errorHandler;
