// Simple in-memory rate limiter
const requestCounts = new Map();

// Limpiar registros antiguos cada hora
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.resetTime > 3600000) { // 1 hora
      requestCounts.delete(key);
    }
  }
}, 3600000); // Cada hora

exports.rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos por defecto
    max = 100, // Máximo de requests por ventana
    message = 'Demasiadas solicitudes, por favor intenta de nuevo más tarde'
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    const data = requestCounts.get(key);

    if (now > data.resetTime) {
      // Reset counter si la ventana expiró
      data.count = 1;
      data.resetTime = now + windowMs;
      return next();
    }

    if (data.count >= max) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }

    data.count++;
    next();
  };
};

// Rate limiter específico para autenticación (más restrictivo)
exports.authLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 intentos
  message: 'Demasiados intentos de login, por favor intenta de nuevo en 15 minutos'
});

// Rate limiter general para la API
exports.apiLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 requests
});
