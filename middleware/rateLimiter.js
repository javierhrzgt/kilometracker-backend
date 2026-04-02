const crypto = require('crypto');

const requestCounts = new Map();

const getFingerprint = (req) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || req.get('user-agent') || 'unknown';
  const hash = crypto.createHash('sha256').update(`${ip}-${userAgent}`).digest('hex').substring(0, 16);
  return `${ip}-${hash}`;
};

const cleanupExpiredEntries = () => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime && now - data.resetTime > 3600000) {
      requestCounts.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[RateLimiter] Cleaned ${cleaned} expired entries`);
  }
};

setInterval(cleanupExpiredEntries, 30 * 60 * 1000);

const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyPrefix = 'default',
    message = 'Too many requests. Please slow down.'
  } = options;

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const fingerprint = getFingerprint(req);
    const key = `${keyPrefix}:${fingerprint}`;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
        violations: 0,
        lastViolation: null,
        blocked: false,
        blockedUntil: null
      });
      setRateLimitHeaders(res, max, max - 1, now + windowMs);
      return next();
    }

    const data = requestCounts.get(key);

    if (data.blocked && now < data.blockedUntil) {
      const retryAfter = Math.ceil((data.blockedUntil - now) / 1000);
      res.set('Retry-After', retryAfter);
      res.set('X-RateLimit-Block-Duration', retryAfter.toString());
      setRateLimitHeaders(res, max, 0, data.resetTime, data.violations);
      return res.status(429).json({
        success: false,
        error: `${message} You are currently blocked due to repeated violations.`,
        retryAfter: retryAfter,
        violations: data.violations,
        blockedUntil: data.blockedUntil
      });
    }

    if (data.blocked && now >= data.blockedUntil) {
      data.blocked = false;
      data.blockedUntil = null;
      data.count = 0;
      data.resetTime = now + windowMs;
      data.violations = 0;
    }

    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + windowMs;
      data.violations = 0;
      setRateLimitHeaders(res, max, max - 1, now + windowMs);
      return next();
    }

    if (data.count >= max) {
      data.violations++;
      data.lastViolation = now;

      const multiplier = getProgressiveMultiplier(data.violations);
      const blockDuration = windowMs * multiplier;
      data.blocked = true;
      data.blockedUntil = now + blockDuration;

      const retryAfter = Math.ceil(blockDuration / 1000);
      res.set('Retry-After', retryAfter);
      res.set('X-RateLimit-Block-Duration', retryAfter.toString());
      setRateLimitHeaders(res, max, 0, data.resetTime, data.violations);

      const minutes = Math.ceil(blockDuration / 60000);
      const progressiveMessage = data.violations > 3
        ? `${message} Your access is temporarily suspended due to repeated violations.`
        : message;

      return res.status(429).json({
        success: false,
        error: progressiveMessage,
        retryAfter: retryAfter,
        violations: data.violations,
        blockedUntil: data.blockedUntil
      });
    }

    data.count++;
    const remaining = Math.max(0, max - data.count);
    setRateLimitHeaders(res, max, remaining, data.resetTime);
    next();
  };
};

const getProgressiveMultiplier = (violations, threshold = 3) => {
  if (violations < threshold) return 1;
  return Math.pow(2, Math.floor((violations - threshold + 1) / threshold) + 1);
};

const setRateLimitHeaders = (res, limit, remaining, resetTime, violations = 0) => {
  res.set('X-RateLimit-Limit', limit.toString());
  res.set('X-RateLimit-Remaining', remaining.toString());
  res.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  if (violations > 0) {
    res.set('X-RateLimit-Violations', violations.toString());
  }
};

exports.loginLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'login',
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

exports.registerLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyPrefix: 'register',
  message: 'Too many registration attempts. Please try again in 1 hour.'
});

exports.passwordResetLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyPrefix: 'password-reset',
  message: 'Too many password reset attempts. Please try again in 15 minutes.'
});

exports.apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyPrefix: 'api',
  message: 'Too many requests. Please slow down.'
});

exports.rateLimiter = rateLimiter;
exports.getFingerprint = getFingerprint;
exports.getProgressiveMultiplier = getProgressiveMultiplier;
exports.requestCounts = requestCounts;
