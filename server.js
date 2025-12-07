// ===== server.js =====
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

// Rate limiting
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");

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

// Aplicar rate limiting general a todas las rutas
app.use("/api/", apiLimiter);

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.error("❌ Error de conexión:", err));

// Rutas
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/vehicles", require("./routes/vehicles"));
app.use("/api/routes", require("./routes/routesVehicle"));
app.use("/api/refuels", require("./routes/refuels"));
app.use("/api/maintenance", require("./routes/maintenance"));
app.use("/api/expenses", require("./routes/expenses"));

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  // Log error for debugging (only stack in development)
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  } else {
    console.error(`${err.name}: ${err.message}`);
  }

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
  console.log(`🚀 Servidor corriendo`);
});
