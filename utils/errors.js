// Custom error classes for standardized error handling

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = "Datos de entrada inválidos") {
    super(message, 400);
    this.name = "ValidationError";
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super(`${resource} no encontrado`, 404);
    this.name = "NotFoundError";
  }
}

class AuthenticationError extends AppError {
  constructor(message = "No autorizado") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

class AuthorizationError extends AppError {
  constructor(message = "No tienes permiso para realizar esta acción") {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

class DuplicateError extends AppError {
  constructor(field = "campo") {
    super(`El ${field} ya existe`, 400);
    this.name = "DuplicateError";
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  DuplicateError,
};
