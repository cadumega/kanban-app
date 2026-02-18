/**
 * Winston Logger Configuration
 * Structured logging for the application
 */

const winston = require('winston');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// JSON format for file/production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'kanban-api' },
  transports: [
    // Console transport (always)
    new winston.transports.Console({
      format: isProduction ? jsonFormat : consoleFormat
    })
  ]
});

// Add file transport in production
if (isProduction) {
  const logsDir = process.env.LOGS_DIR || path.join(__dirname, '../../logs');

  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: jsonFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: jsonFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Helper methods for common patterns
logger.request = (req, message, meta = {}) => {
  logger.info(message, {
    ...meta,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip
  });
};

logger.authEvent = (event, userId, email, success, meta = {}) => {
  logger.info(`Auth: ${event}`, {
    ...meta,
    event,
    userId,
    email,
    success
  });
};

logger.securityEvent = (event, details, req = null) => {
  logger.warn(`Security: ${event}`, {
    event,
    details,
    ip: req?.ip,
    userAgent: req?.get('user-agent'),
    path: req?.path
  });
};

module.exports = logger;
