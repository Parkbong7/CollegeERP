const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const bcrypt = require(path.resolve(__dirname, '../Node-services/node_modules/bcryptjs'));
const { Client } = require(pgPath);

async function setupUsers() {
  const authClient = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_auth' });
  const masterClient = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_master' });
  const studentClient = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_student' });

  await authClient.connect();
  await masterClient.connect();
  await studentClient.connect();

  const tenantRes = await authClient.query("SELECT id FROM tenants WHERE code = 'ABC_ENG' OR code = 'ABC' LIMIT 1");
  const tenantId = tenantRes.rows[0]?.id;

  const rolesRes = await authClient.query("SELECT id, name FROM roles");
  const roleMap = {};
  rolesRes.rows.forEach(r => { roleMap[r.name] = r.id; });

  const deptsRes = await masterClient.query("SELECT id, code, name FROM departments");
  const deptMap = {};
  deptsRes.rows.forEach(d => { deptMap[d.code] = d; });

  const staffRes = await masterClient.query("SELECT s.id, s.name, s.email, s.employee_id, s.designation, d.code as dept_code FROM staff s JOIN departments d ON s.department_id = d.id");
  const studentRes = await studentClient.query("SELECT s.id, s.name, s.email, s.roll_number, d.code as dept_code, s.department_id FROM students s JOIN departments d ON s.department_id = d.id");

  console.log(`Found ${rolesRes.rows.length} roles, ${deptsRes.rows.length} departments, ${staffRes.rows.length} staff, ${studentRes.rows.length} students`);

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  // 1. Ensure CSE HOD user
  const cseHodStaff = staffRes.rows.find(s => s.email === 'ramesh.sharma@abccollege.edu' || s.employee_id === 'STF001');
  const cseDept = deptMap['CSE'];
  if (cseDept) {
    await authClient.query(`
      INSERT INTO users (id, tenant_id, role_id, department_id, staff_id, username, email, password_hash, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'hod.cse', 'hod.cse@abccollege.edu', $5, 'Dr. Ramesh Sharma', 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role_id = $2, department_id = $3, staff_id = $4, password_hash = $5, name = 'Dr. Ramesh Sharma', updated_at = NOW()
    `, [tenantId, roleMap['HOD'], cseDept.id, cseHodStaff?.id, passwordHash]);
    console.log('✓ CSE HOD (hod.cse@abccollege.edu) synced');
  }

  // 2. Ensure ECE HOD user
  const eceHodStaff = staffRes.rows.find(s => s.email === 'sunita.rao@abccollege.edu' || s.employee_id === 'STF004');
  const eceDept = deptMap['ECE'];
  if (eceDept) {
    await authClient.query(`
      INSERT INTO users (id, tenant_id, role_id, department_id, staff_id, username, email, password_hash, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'hod.ece', 'hod.ece@abccollege.edu', $5, 'Dr. Sunita Rao', 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role_id = $2, department_id = $3, staff_id = $4, password_hash = $5, name = 'Dr. Sunita Rao', updated_at = NOW()
    `, [tenantId, roleMap['HOD'], eceDept.id, eceHodStaff?.id, passwordHash]);
    console.log('✓ ECE HOD (hod.ece@abccollege.edu) synced');
  }

  // 3. Ensure Staff users (Arun Kumar - CSE, Rajesh Kulkarni - ECE, Sneha Verma - CSE)
  const arunStaff = staffRes.rows.find(s => s.employee_id === 'STF002' || s.email === 'staff.arun@abccollege.edu');
  if (arunStaff && cseDept) {
    await authClient.query(`
      INSERT INTO users (id, tenant_id, role_id, department_id, staff_id, username, email, password_hash, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'staff.arun', 'staff.arun@abccollege.edu', $5, 'Arun Kumar', 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role_id = $2, department_id = $3, staff_id = $4, password_hash = $5, name = 'Arun Kumar', updated_at = NOW()
    `, [tenantId, roleMap['Staff'], cseDept.id, arunStaff.id, passwordHash]);
    console.log('✓ CSE Staff (staff.arun@abccollege.edu) synced');
  }

  const snehaStaff = staffRes.rows.find(s => s.employee_id === 'STF003' || s.email === 'sneha.verma@abccollege.edu');
  if (snehaStaff && cseDept) {
    await authClient.query(`
      INSERT INTO users (id, tenant_id, role_id, department_id, staff_id, username, email, password_hash, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'sneha.verma', 'sneha.verma@abccollege.edu', $5, 'Sneha Verma', 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role_id = $2, department_id = $3, staff_id = $4, password_hash = $5, name = 'Sneha Verma', updated_at = NOW()
    `, [tenantId, roleMap['Staff'], cseDept.id, snehaStaff.id, passwordHash]);
    console.log('✓ CSE Staff (sneha.verma@abccollege.edu) synced');
  }

  const rajeshStaff = staffRes.rows.find(s => s.employee_id === 'STF005' || s.email === 'rajesh.k@abccollege.edu');
  if (rajeshStaff && eceDept) {
    await authClient.query(`
      INSERT INTO users (id, tenant_id, role_id, department_id, staff_id, username, email, password_hash, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'rajesh.ece', 'rajesh.k@abccollege.edu', $5, 'Rajesh Kulkarni', 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role_id = $2, department_id = $3, staff_id = $4, password_hash = $5, name = 'Rajesh Kulkarni', updated_at = NOW()
    `, [tenantId, roleMap['Staff'], eceDept.id, rajeshStaff.id, passwordHash]);
    console.log('✓ ECE Staff (rajesh.k@abccollege.edu) synced');
  }

  // 4. Ensure Student users (Aarav Patel - CSE, Vikram Singh - ECE, Neha Sharma - CSE)
  const aaravStudent = studentRes.rows.find(s => s.roll_number === 'CSE-2026-001' || s.email === 'aarav.p@student.abccollege.edu');
  if (aaravStudent && cseDept) {
    await authClient.query(`
      INSERT INTO users (id, tenant_id, role_id, department_id, student_id, username, email, password_hash, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'aarav.patel', 'aarav.p@student.abccollege.edu', $5, 'Aarav Patel', 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role_id = $2, department_id = $3, student_id = $4, password_hash = $5, name = 'Aarav Patel', updated_at = NOW()
    `, [tenantId, roleMap['Student'], cseDept.id, aaravStudent.id, passwordHash]);
    console.log('✓ CSE Student (aarav.p@student.abccollege.edu, roll: CSE-2026-001) synced');
  }

  const vikramStudent = studentRes.rows.find(s => s.roll_number === 'ECE-2026-001' || s.email === 'vikram.s@student.abccollege.edu');
  if (vikramStudent && eceDept) {
    await authClient.query(`
      INSERT INTO users (id, tenant_id, role_id, department_id, student_id, username, email, password_hash, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'vikram.singh', 'vikram.s@student.abccollege.edu', $5, 'Vikram Singh', 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role_id = $2, department_id = $3, student_id = $4, password_hash = $5, name = 'Vikram Singh', updated_at = NOW()
    `, [tenantId, roleMap['Student'], eceDept.id, vikramStudent.id, passwordHash]);
    console.log('✓ ECE Student (vikram.s@student.abccollege.edu, roll: ECE-2026-001) synced');
  }

  const nehaStudent = studentRes.rows.find(s => s.roll_number === 'CSE-2025-001' || s.email === 'neha.s@student.abccollege.edu');
  if (nehaStudent && cseDept) {
    await authClient.query(`
      INSERT INTO users (id, tenant_id, role_id, department_id, student_id, username, email, password_hash, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'neha.sharma', 'neha.s@student.abccollege.edu', $5, 'Neha Sharma', 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role_id = $2, department_id = $3, student_id = $4, password_hash = $5, name = 'Neha Sharma', updated_at = NOW()
    `, [tenantId, roleMap['Student'], cseDept.id, nehaStudent.id, passwordHash]);
    console.log('✓ CSE Student (neha.s@student.abccollege.edu, roll: CSE-2025-001) synced');
  }

  // Also make sure generic shortcut users 'student', 'staff', 'hod' point to concrete entities
  await authClient.query(`
    UPDATE users SET student_id = $1, department_id = $2 WHERE username = 'student'
  `, [aaravStudent?.id, cseDept?.id]);

  await authClient.query(`
    UPDATE users SET staff_id = $1, department_id = $2 WHERE username = 'staff'
  `, [arunStaff?.id, cseDept?.id]);

  await authClient.query(`
    UPDATE users SET staff_id = $1, department_id = $2 WHERE username = 'hod'
  `, [cseHodStaff?.id, cseDept?.id]);

  console.log('\n--- ALL USERS READY ---');
  const finalUsers = await authClient.query(`
    SELECT u.username, u.email, u.name, r.name as role, u.department_id, u.staff_id, u.student_id 
    FROM users u JOIN roles r ON u.role_id = r.id ORDER BY r.name, u.username
  `);
  console.table(finalUsers.rows);

  await authClient.end();
  await masterClient.end();
  await studentClient.end();
}

setupUsers().catch(console.error);
