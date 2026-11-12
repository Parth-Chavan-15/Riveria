const fs = require('fs');

function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (req.file?.path) {
    fs.promises.unlink(req.file.path).catch(() => {});
  }
  if (res.headersSent) return next(error);

  if (error.name === 'ZodError') {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues?.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        })) || []
      }
    });
  }

  if (error.name === 'MulterError') {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 422;
    return res.status(status).json({
      error: {
        code: error.code || 'UPLOAD_ERROR',
        message: error.message
      }
    });
  }

  const status = error.statusCode || error.status || 500;
  if (process.env.NODE_ENV !== 'test' && status >= 500) console.error(error);
  res.status(status).json({
    error: {
      code: error.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      message: status >= 500 ? 'An unexpected server error occurred' : error.message
    }
  });
}

module.exports = { notFound, errorHandler };
