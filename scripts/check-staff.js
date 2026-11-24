const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

async function check() {
  const c = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_master' });
  await c.connect();
  const res = await c.query("SELECT s.id, s.name, s.email, s.employee_id, s.designation, d.code as dept_code, d.name as dept_name FROM staff s JOIN departments d ON s.department_id = d.id ORDER BY d.code, s.name");
  console.table(res.rows);
  await c.end();
}
check().catch(console.error);
