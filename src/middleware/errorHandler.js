const { logError } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const errorId = logError(err, {
    req,
    statusCode,
    isOperational: err.isOperational || false,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const isOperational = err.isOperational || false;

  if (statusCode >= 500) {
    return res.status(statusCode).json({
      success: false,
      error: isProduction ? 'Internal Server Error' : err.message,
      ...(isProduction ? {} : { errorId, stack: err.stack }),
    });
  }

  if (statusCode === 404) {
    return res.status(404).json({
      success: false,
      error: isProduction ? 'Resource not found' : (err.message || 'Not found'),
      ...(isProduction ? {} : { errorId }),
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: err.message,
    ...(isProduction ? {} : { errorId }),
  });
};

module.exports = errorHandler;
