const { services } = require('../config/gateway.config');

exports.getStatus = (req, res) => {
  res.json({
    gateway: 'Online',
    timestamp: new Date().toISOString(),
    registeredServices: services
  });
};
