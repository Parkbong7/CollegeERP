const sequelize = require('../Node-services/AccessManager-services/config/db.config');
const { Sequelize } = sequelize;

const dbs = ['college_erp_db', 'service_erp_master', 'service_erp_student', 'service_erp_department', 'service_erp_auth'];

async function check() {
  for (const db of dbs) {
    try {
      const s = new Sequelize(db, 'postgres', 'kaiazer07', { host: 'localhost', port: 5432, dialect: 'postgres', logging: false });
      const res = await s.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
      console.log(`\n=== DB: ${db} ===`, res[0]);
      await s.close();
    } catch (e) {
      console.log(`\n=== DB: ${db} === Error:`, e.message);
    }
  }
}

check();
