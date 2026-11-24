const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

async function check() {
  const c = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_auth' });
  await c.connect();
  const res = await c.query("SELECT id, name, email, roll_number, department_id, academic_year_id FROM students LIMIT 10");
  console.table(res.rows);
  await c.end();
}
check().catch(console.error);
