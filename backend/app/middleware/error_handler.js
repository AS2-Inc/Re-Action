const error_handler = (err, _req, res, _next) => {
  res.status(res.status_code);
  res.json({
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export default error_handler;
