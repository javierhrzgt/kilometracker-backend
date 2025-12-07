// ===== server.js =====
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

// Logging
const { logger } = require("./utils/logger");
const { requestLogger, attachRequestContext } = require("./middleware/requestLogger");

// Rate limiting
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");

// Trust proxy for proper IP detection behind reverse proxies
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS configuration - whitelist allowed origins
const allowedOrigins = [
  "https://kilometracker.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging and tracing
app.use(requestLogger);
app.use(attachRequestContext);

// Aplicar rate limiting general a todas las rutas
app.use("/api/", apiLimiter);

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("MongoDB conectado"))
  .catch((err) => logger.error("Error de conexión a MongoDB", { error: err.message }));

// Rutas
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/vehicles", require("./routes/vehicles"));
app.use("/api/routes", require("./routes/routesVehicle"));
app.use("/api/refuels", require("./routes/refuels"));
app.use("/api/maintenance", require("./routes/maintenance"));
app.use("/api/expenses", require("./routes/expenses"));

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  // Log error with request context
  const errorDetails = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
    errorName: err.name,
    errorMessage: err.message
  };

  if (process.env.NODE_ENV === "development") {
    errorDetails.stack = err.stack;
  }

  logger.error("Request error", errorDetails);

  // Handle specific error types
  let statusCode = err.statusCode || 500;
  let message = err.message || "Error del servidor";

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(", ");
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `El ${field} ya existe`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "ID inválido";
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token inválido";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expirado";
  }

  // Don't expose internal error messages in production
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Error del servidor";
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Servidor corriendo en puerto ${PORT}`, { port: PORT, env: process.env.NODE_ENV });
});

module.exports = app;
