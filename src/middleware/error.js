export function notFound(req,res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    message: err.message || "Server error",
  };
  if (process.env.Node_ENV === 'production') {
    payload.stack = err.stack;
  }
  res.status(status).json(payload)
}