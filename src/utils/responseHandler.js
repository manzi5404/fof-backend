const { logError } = require('../utils/logger');

function handleServiceError(res, err, req = null) {
  const isOperational = err.isOperational || false;
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500 || !isOperational) {
    logError(err, { req, statusCode });
  } else if (statusCode >= 400) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        statusCode,
        message: err.message,
        context: {
          method: req?.method || 'N/A',
          url: req?.url || 'N/A',
          user: req?.user ? { id: req.user.id, role: req.user.role } : null,
        },
      })
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    return res.status(statusCode).json({
      success: false,
      error: isProduction ? 'Internal Server Error' : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  }

  if (statusCode === 404) {
    return res.status(404).json({
      success: false,
      error: isProduction ? 'Resource not found' : (err.message || 'Not found'),
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: err.message,
  });
}

module.exports = { handleServiceError };
