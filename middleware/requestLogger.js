const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Generate a unique request ID
 * @returns {string} A unique request ID
 */
const generateRequestId = () => {
  return crypto.randomUUID();
};

/**
 * Request logging middleware
 * - Adds unique request ID (X-Request-ID)
 * - Logs request start and completion
 * - Tracks request duration
 */
const requestLogger = (req, res, next) => {
  // Get or generate request ID
  const requestId = req.headers['x-request-id'] || generateRequestId();
  req.requestId = requestId;

  // Set request ID in response header
  res.setHeader('X-Request-ID', requestId);

  // Record start time
  const startTime = Date.now();

  // Get client IP (considering proxies)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.socket?.remoteAddress ||
                   'unknown';

  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: clientIp,
    userAgent: req.headers['user-agent']
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);

    const duration = Date.now() - startTime;
    const userId = req.user?.id || 'anonymous';

    // Determine log level based on status code
    const statusCode = res.statusCode;
    let logLevel = 'info';
    if (statusCode >= 500) logLevel = 'error';
    else if (statusCode >= 400) logLevel = 'warn';

    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      userId,
      ip: clientIp
    });
  };

  next();
};

/**
 * Middleware to attach request ID to logs from route handlers
 * Use this to access requestId in controllers
 */
const attachRequestContext = (req, res, next) => {
  // Make requestId available for logging in route handlers
  req.log = {
    info: (message, meta = {}) => logger.info(message, { requestId: req.requestId, userId: req.user?.id, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { requestId: req.requestId, userId: req.user?.id, ...meta }),
    error: (message, meta = {}) => logger.error(message, { requestId: req.requestId, userId: req.user?.id, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { requestId: req.requestId, userId: req.user?.id, ...meta })
  };
  next();
};

module.exports = { requestLogger, attachRequestContext, generateRequestId };
