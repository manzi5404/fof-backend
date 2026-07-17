class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class ConflictError extends AppError {
  constructor(message) { super(message, 409); }
}

class NotFoundError extends AppError {
  constructor(message) { super(message, 404); }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400); }
}

class AuthError extends AppError {
  constructor(message) { super(message, 401); }
}

class ForbiddenError extends AppError {
  constructor(message) { super(message, 403); }
}

module.exports = { AppError, ConflictError, NotFoundError, ValidationError, AuthError, ForbiddenError };
