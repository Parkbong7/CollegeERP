const loggerMiddleware = require('./loggerMiddleware');
const authMiddleware = require('./authMiddleware');
const errorHandler = require('./errorHandler');

module.exports = {
  loggerMiddleware,
  authMiddleware,
  errorHandler
};
