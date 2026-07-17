const crypto = require('crypto');

function generateErrorId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function getTimestamp() {
  return new Date().toISOString();
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const sensitiveKeys = [
    'password', 'password_hash', 'token', 'access_token', 'refresh_token',
    'id_token', 'google_id', 'secret', 'api_key', 'private_key',
    'service_role_key', 'anon_key', 'supabase_url', 'proof_url',
    'payment_reference', 'notes', 'authorization',
  ];

  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = sanitize(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return sanitize(body);
}

function logError(err, context = {}) {
  const {
    req = null,
    statusCode = 500,
    isOperational = false,
  } = context;

  const errorId = generateErrorId();
  const timestamp = getTimestamp();

  const logEntry = {
    errorId,
    timestamp,
    statusCode,
    isOperational: err.isOperational || isOperational,
    message: err.message || 'Unknown error',
    stack: err.stack,
    context: {
      method: req?.method || 'N/A',
      url: req?.url || req?.originalUrl || 'N/A',
      user: req?.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : null,
      ip: req?.ip || req?.connection?.remoteAddress || 'N/A',
      userAgent: req?.get('user-agent') || 'N/A',
      body: req ? sanitizeBody(req.body) : 'N/A',
      params: req?.params || 'N/A',
      query: req?.query || 'N/A',
    },
  };

  console.error(JSON.stringify(logEntry, null, 2));

  return errorId;
}

module.exports = {
  generateErrorId,
  getTimestamp,
  sanitizeBody,
  logError,
};
