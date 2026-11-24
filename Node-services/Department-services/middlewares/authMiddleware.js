const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. No bearer token provided.' }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'college_service_erp_jwt_super_secret_key_2026', (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { message: 'Invalid or expired authentication token.' }
      });
    }

    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  });
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    // Super Admin inherits Admin permissions
    const effectiveRoles = [...allowedRoles];
    if (allowedRoles.includes('Admin') && !effectiveRoles.includes('Super Admin')) {
      effectiveRoles.push('Super Admin');
    }

    if (!req.user || !effectiveRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: { message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]` }
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles
};
