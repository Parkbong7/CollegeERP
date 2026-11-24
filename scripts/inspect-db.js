const { Client } = require('pg');

async function check() {
  const dbs = ['college_erp_auth', 'college_erp_master', 'college_erp_student', 'college_erp_department'];
  for (const db of dbs) {
    const c = new Client({ connectionString: `postgres://postgres:kaiazer07@localhost:5432/${db}` });
    await c.connect();
    const res = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log(`\n=== ${db} ===`);
    console.log(res.rows.map(r => r.table_name));
    await c.end();
  }
}

check().catch(console.error);
