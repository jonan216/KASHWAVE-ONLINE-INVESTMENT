function errorHandler(err, req, res, next) {
  // Detailed internal server console logging
  console.error('[API SECURITY ERROR LOG]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    timestamp: new Date().toISOString()
  });

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Mask database details from clients (preventing PostgreSQL stack trace leakages - OWASP best practice)
  let userMessage = err.message || 'An internal server error occurred.';
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    userMessage = 'A secure database or system error occurred. Please contact administrative support.';
  }

  res.status(statusCode).json({
    success: false,
    message: userMessage,
    // Stack trace is only exposed in DEVELOPMENT mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
