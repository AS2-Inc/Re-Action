const errorHandler = (err, _req, res, _next) => {
  res.status(res.statusCode);
  res.json({
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export default errorHandler;
