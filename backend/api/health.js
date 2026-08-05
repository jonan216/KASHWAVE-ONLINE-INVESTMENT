module.exports = (req, res) => {
  res.json({
    status: 'online',
    platform: 'KASHWAVE ONLINE INVESTMENT PLATFORM',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
};
