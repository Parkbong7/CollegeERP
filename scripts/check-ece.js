const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

async function checkEce() {
  const c = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_student' });
  await c.connect();
  const eceStudents = await c.query("SELECT s.id, s.name, s.roll_number, s.department_id, s.academic_year_id FROM students s JOIN departments d ON s.department_id = d.id WHERE d.code = 'ECE' AND s.roll_number ILIKE '%2026%'");
  console.log('ECE Year 1 Students:');
  console.table(eceStudents.rows);

  const eceSubs = await c.query("SELECT s.id, s.name, s.code, s.department_id, s.academic_year_id FROM subjects s JOIN departments d ON s.department_id = d.id WHERE d.code = 'ECE'");
  console.log('ECE Subjects:');
  console.table(eceSubs.rows);

  await c.end();
}
checkEce().catch(console.error);
