const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors,
        });
      }

      req.validated = result.data;
      return next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
      });
    }
  };
};

module.exports = { validate };
