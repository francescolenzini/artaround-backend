function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  const message = error.message || 'Internal server error';

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: {
      message,
      status,
    },
  });
}

module.exports = { errorHandler };
