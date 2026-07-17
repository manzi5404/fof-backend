const { supabase } = require('../config/supabase');
const { AuthError } = require('../utils/errors');

const extractBearerToken = (headerValue) => {
  if (!headerValue) return null;
  const parts = String(headerValue).trim().split(' ');
  if (parts.length === 2 && /^bearer$/i.test(parts[0])) return parts[1];
  return null;
};

const requireAuth = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Missing Bearer token',
    });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, email, role, name')
    .eq('id', data.user.id)
    .maybeSingle();

  if (userError) {
    console.error('[AUTH] Database error fetching user profile:', userError);
    return res.status(500).json({
      success: false,
      error: 'Failed to load user profile',
    });
  }

  if (!userRow) {
    const { data: emailRow } = await supabase
      .from('users')
      .select('id, email, role, name')
      .eq('email', data.user.email)
      .maybeSingle();

    if (!emailRow) {
      return res.status(401).json({
        success: false,
        error: 'User profile not found',
      });
    }

    req.user = {
      id: emailRow.id,
      email: emailRow.email,
      role: emailRow.role,
      name: emailRow.name,
    };

    return next();
  }

  req.user = {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role,
    name: userRow.name,
  };

  return next();
};

const optionalAuth = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next();
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return next();
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('id, email, role, name')
      .eq('id', data.user.id)
      .maybeSingle();

    if (userRow) {
      req.user = {
        id: userRow.id,
        email: userRow.email,
        role: userRow.role,
        name: userRow.name,
      };
    }
  } catch (err) {
    // ignore auth errors for optional auth
  }

  return next();
};

const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  return next();
};

module.exports = { requireAuth, optionalAuth, requireAdmin };
