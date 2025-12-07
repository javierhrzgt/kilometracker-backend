const winston = require('winston');

// Custom format for structured logging
const structuredFormat = winston.format.printf(({ level, message, timestamp, requestId, userId, ...metadata }) => {
  const meta = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  const reqId = requestId ? `[${requestId}]` : '';
  const user = userId ? `[user:${userId}]` : '';
  return `${timestamp} ${level.toUpperCase()} ${reqId}${user} ${message} ${meta}`;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: { service: 'kilometracker-api' },
  transports: []
});

// Console transport with different format based on environment
if (process.env.NODE_ENV === 'production') {
  // JSON format for production (better for log aggregation)
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
} else {
  // Human-readable format for development
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      structuredFormat
    )
  }));
}

// File transport for errors (always enabled)
if (process.env.NODE_ENV !== 'test') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));

  // Combined log file
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Audit logger for sensitive operations
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'kilometracker-audit' },
  transports: []
});

if (process.env.NODE_ENV !== 'test') {
  auditLogger.add(new winston.transports.File({
    filename: 'logs/audit.log',
    maxsize: 5242880, // 5MB
    maxFiles: 10
  }));
}

// Also log to console in development
if (process.env.NODE_ENV === 'development') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        return `${timestamp} AUDIT ${level.toUpperCase()} ${message} ${JSON.stringify(meta)}`;
      })
    )
  }));
}

/**
 * Log audit events for sensitive operations
 * @param {string} action - The action being performed
 * @param {Object} details - Details about the action
 */
const logAudit = (action, details) => {
  auditLogger.info(action, {
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = { logger, logAudit };
