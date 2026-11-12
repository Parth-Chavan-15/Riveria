const fs = require('fs');

const validate = (schema) => (req, res, next) => {
    try {
        const parsed = schema.parse({
            body: req.body || {},
            query: req.query || {},
            params: req.params || {},
        });
        req.body = parsed.body;
        req.query = parsed.query;
        req.params = parsed.params;
        next();
    } catch (error) {
        if (req.file?.path) {
            fs.promises.unlink(req.file.path).catch(() => {});
        }
        if (!error.issues) return next(error);
        return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: error.issues.map(err => ({
                field: err.path.join('.'),
                message: err.message
              }))
            }
        });
    }
};

module.exports = validate;
