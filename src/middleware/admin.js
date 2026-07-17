const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin role required',
    });
  }

  return next();
};

module.exports = { requireAdmin };
