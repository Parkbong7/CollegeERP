const sequelize = require('../Node-services/AccessManager-services/config/db.config');

const tables = [
  'tenants', 'roles', 'permissions', 'users', 'departments',
  'academic_years', 'subjects', 'staff', 'students',
  'hod_assignments', 'staff_subject_assignments'
];

async function checkRows() {
  console.log('=== ROW COUNTS IN college_erp_db ===');
  for (const t of tables) {
    try {
      const [res] = await sequelize.query(`SELECT COUNT(*) as count FROM "${t}";`);
      console.log(`${t}: ${res[0].count}`);
    } catch (e) {
      console.log(`${t}: Error - ${e.message}`);
    }
  }
  await sequelize.close();
}

checkRows();
