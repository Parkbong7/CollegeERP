const bcrypt = require('../Node-services/node_modules/bcryptjs');
const authSeq = require('../Node-services/AccessManager-services/config/db.config');
const masterSeq = require('../Node-services/MasterConfiguration-services/config/db.config');
const studentSeq = require('../Node-services/Student-services/config/db.config');
const deptSeq = require('../Node-services/Department-services/config/db.config');

async function addSuperAdmin() {
  const dbs = [authSeq, masterSeq, studentSeq, deptSeq];
  const hash = await bcrypt.hash('Admin@123', 10);
  for (const seq of dbs) {
    const [roles] = await seq.query("SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1;");
    const [tenants] = await seq.query("SELECT id FROM tenants WHERE status = 'active' LIMIT 1;");
    const roleId = roles[0].id;
    const tenantId = tenants[0].id;

    const [exists] = await seq.query("SELECT id FROM users WHERE username = 'superadmin';");
    if (!exists.length) {
      await seq.query(`
        INSERT INTO users (id, tenant_id, role_id, username, email, password_hash, name, status, created_at, updated_at)
        VALUES (gen_random_uuid(), '${tenantId}', '${roleId}', 'superadmin', 'superadmin@abccollege.edu', '${hash}', 'Super Administrator', 'active', NOW(), NOW());
      `);
      console.log('✓ Inserted superadmin in database');
    } else {
      console.log('= superadmin already exists in database');
    }
    await seq.close();
  }
}

addSuperAdmin().catch(console.error);
