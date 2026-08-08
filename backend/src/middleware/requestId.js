const { generateRequestId } = require('../utils/token');

function requestId(req, res, next) {
  const requestId = generateRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

module.exports = requestId;
