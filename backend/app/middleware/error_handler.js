const error_handler = (err, _req, res, _next) => {
  // Prefer an explicit statusCode set earlier in the pipeline (e.g. in controllers)
  // and fall back to 500 when none was provided.
  const statusCode =
    err?.statusCode && Number.isInteger(err.statusCode) && err.statusCode >= 400
      ? err.statusCode
      : res.statusCode && res.statusCode !== 200
        ? res.statusCode
        : 500;

  res.status(statusCode).json({
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export default error_handler;
