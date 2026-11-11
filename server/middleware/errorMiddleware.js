function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(error);
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
