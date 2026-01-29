const error_handler = (err, _req, res, _next) => {
  if (!res.status_code) res.status_code = 500;
  res.status(res.status_code);
  res.json({
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export default error_handler;
