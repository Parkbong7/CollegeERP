const models = require('../models');

async function resolveTenant(req, res, next) {
  try {
    let tenantId = req.user?.tenantId;

    if (!tenantId) {
      const defaultTenant = await models.Tenant.findOne({
        where: { code: process.env.DEFAULT_TENANT_CODE || 'ABC_ENG', status: 'active' }
      });

      if (!defaultTenant) {
        return res.status(500).json({
          success: false,
          error: { message: 'Default institution tenant not configured or inactive.' }
        });
      }
      tenantId = defaultTenant.id;
    }

    req.tenantId = tenantId;
    next();
  } catch (err) {
    console.error('[Tenant Context Error]', err);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error while resolving institutional tenant.' }
    });
  }
}

module.exports = {
  resolveTenant
};
