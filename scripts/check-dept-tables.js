const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

async function checkDeptTables() {
  const c = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_department' });
  await c.connect();
  const res = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.table(res.rows);
  await c.end();
}
checkDeptTables().catch(console.error);
