const express = require('express');
const helmet = require('helmet');

const app = express();

// Logging (use silent logger in tests)
const { requestLogger, attachRequestContext } = require('../middleware/requestLogger');

// Rate limiting (disabled in tests - use a mock)
const mockLimiter = (req, res, next) => next();

// Security headers
app.use(helmet());

// CORS - allow all in tests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging and tracing
app.use(requestLogger);
app.use(attachRequestContext);

// Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/vehicles', require('../routes/vehicles'));
app.use('/api/routes', require('../routes/routesVehicle'));
app.use('/api/refuels', require('../routes/refuels'));
app.use('/api/maintenance', require('../routes/maintenance'));
app.use('/api/expenses', require('../routes/expenses'));

// Error handling middleware
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error del servidor';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `El ${field} ya existe`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID inválido';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  res.status(statusCode).json({
    success: false,
    error: message
  });
});

module.exports = app;
