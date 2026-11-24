const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

async function inspectData() {
  const authClient = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_auth' });
  const masterClient = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_master' });
  const studentClient = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_student' });

  await authClient.connect();
  await masterClient.connect();
  await studentClient.connect();

  console.log('--- AUTH USERS ---');
  const users = await authClient.query('SELECT u.id, u.username, u.email, r.name as role, u.department_id, u.staff_id, u.student_id FROM users u JOIN roles r ON u.role_id = r.id ORDER BY r.name, u.username');
  console.table(users.rows);

  console.log('--- MASTER DEPARTMENTS ---');
  const depts = await masterClient.query('SELECT * FROM departments');
  console.table(depts.rows);

  console.log('--- MASTER STAFF ---');
  const staff = await masterClient.query('SELECT id, name, email, department_id, employee_id, designation FROM staff');
  console.table(staff.rows);

  console.log('--- STUDENT PROFILES ---');
  const students = await studentClient.query('SELECT id, name, email, roll_number, department_id, academic_year_id FROM students');
  console.table(students.rows);

  await authClient.end();
  await masterClient.end();
  await studentClient.end();
}

inspectData().catch(console.error);
