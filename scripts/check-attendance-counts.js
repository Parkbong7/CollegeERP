const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

async function checkAttendance() {
  const c = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_student' });
  await c.connect();
  const res = await c.query(`
    SELECT a.student_id, s.name, s.roll_number, d.code as dept_code, COUNT(a.id) as record_count 
    FROM attendances a 
    JOIN students s ON a.student_id = s.id 
    JOIN departments d ON a.department_id = d.id 
    GROUP BY a.student_id, s.name, s.roll_number, d.code
  `);
  console.table(res.rows);
  await c.end();
}
checkAttendance().catch(console.error);
