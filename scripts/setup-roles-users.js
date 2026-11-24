const bcrypt = require('../Node-services/AccessManager-services/node_modules/bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authModels = require('../Node-services/AccessManager-services/models');
const studentModels = require('../Node-services/Student-services/models');

async function setup() {
  console.log('--- 1. Setting up Roles & Users in college_erp_auth ---');

  // Find tenant
  const tenant = await authModels.Tenant.findOne({ where: { status: 'active' } });
  if (!tenant) throw new Error('Active tenant not found');
  console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

  // 1. Ensure Student role exists
  let studentRole = await authModels.Role.findOne({ where: { name: 'Student' } });
  if (!studentRole) {
    studentRole = await authModels.Role.create({
      name: 'Student',
      description: 'Enrolled student with view access to year curriculum and personal attendance records'
    });
    console.log('Created Student role in auth database:', studentRole.id);
  } else {
    console.log('Student role already exists:', studentRole.id);
  }

  // Get other roles
  const superAdminRole = await authModels.Role.findOne({ where: { name: 'Super Admin' } });
  const hodRole = await authModels.Role.findOne({ where: { name: 'HOD' } });
  const staffRole = await authModels.Role.findOne({ where: { name: 'Staff' } });
  const subAdminRole = await authModels.Role.findOne({ where: { name: 'Sub Admin' } });

  // Add student_id column to users table if missing
  try {
    await authModels.sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "student_id" UUID;');
    console.log('Verified student_id column on users table.');
  } catch (err) {
    console.log('Column check note:', err.message);
  }

  const hash = await bcrypt.hash('Admin@123', 10);

  // Departments
  const cseDept = await authModels.Department.findOne({ where: { code: 'CSE', tenant_id: tenant.id } });
  const staffArun = await authModels.Staff.findOne({ where: { name: 'Arun Kumar', tenant_id: tenant.id } });

  // Find a student in student service
  const studentAarav = await studentModels.Student.findOne({ where: { tenant_id: tenant.id } });
  console.log('Found Student for linking:', studentAarav ? `${studentAarav.name} (${studentAarav.roll_number})` : 'None');

  // Upsert 'hod' user
  let hodUser = await authModels.User.findOne({ where: { username: 'hod', tenant_id: tenant.id } });
  if (!hodUser) {
    hodUser = await authModels.User.create({
      tenant_id: tenant.id,
      role_id: hodRole.id,
      department_id: cseDept ? cseDept.id : null,
      username: 'hod',
      email: 'hod@abccollege.edu',
      password_hash: hash,
      name: 'Dr. Ramesh Sharma (HOD)',
      status: 'active'
    });
    console.log('Created user: hod (Role: HOD)');
  } else {
    await hodUser.update({ role_id: hodRole.id, password_hash: hash, status: 'active' });
    console.log('Updated user: hod (Role: HOD)');
  }

  // Ensure 'hod.cse' user has correct password
  let hodCseUser = await authModels.User.findOne({ where: { username: 'hod.cse', tenant_id: tenant.id } });
  if (hodCseUser) {
    await hodCseUser.update({ password_hash: hash, status: 'active' });
    console.log('Updated password for hod.cse');
  }

  // Upsert 'staff' user
  let staffUser = await authModels.User.findOne({ where: { username: 'staff', tenant_id: tenant.id } });
  if (!staffUser) {
    staffUser = await authModels.User.create({
      tenant_id: tenant.id,
      role_id: staffRole.id,
      department_id: cseDept ? cseDept.id : null,
      staff_id: staffArun ? staffArun.id : null,
      username: 'staff',
      email: 'staff@abccollege.edu',
      password_hash: hash,
      name: 'Arun Kumar (Faculty)',
      status: 'active'
    });
    console.log('Created user: staff (Role: Staff)');
  } else {
    await staffUser.update({
      role_id: staffRole.id,
      department_id: cseDept ? cseDept.id : null,
      staff_id: staffArun ? staffArun.id : null,
      password_hash: hash,
      status: 'active'
    });
    console.log('Updated user: staff (Role: Staff)');
  }

  // Ensure 'staff.arun' user has correct password
  let staffArunUser = await authModels.User.findOne({ where: { username: 'staff.arun', tenant_id: tenant.id } });
  if (staffArunUser) {
    await staffArunUser.update({ password_hash: hash, status: 'active' });
    console.log('Updated password for staff.arun');
  }

  // Upsert 'student' user
  let studentUser = await authModels.User.findOne({ where: { username: 'student', tenant_id: tenant.id } });
  if (!studentUser) {
    studentUser = await authModels.User.create({
      tenant_id: tenant.id,
      role_id: studentRole.id,
      department_id: studentAarav ? studentAarav.department_id : (cseDept ? cseDept.id : null),
      student_id: studentAarav ? studentAarav.id : null,
      username: 'student',
      email: studentAarav ? studentAarav.email : 'student@abccollege.edu',
      password_hash: hash,
      name: studentAarav ? studentAarav.name : 'Aarav Patel (Student)',
      status: 'active'
    });
    console.log('Created user: student (Role: Student)');
  } else {
    await studentUser.update({
      role_id: studentRole.id,
      department_id: studentAarav ? studentAarav.department_id : (cseDept ? cseDept.id : null),
      student_id: studentAarav ? studentAarav.id : null,
      password_hash: hash,
      status: 'active'
    });
    console.log('Updated user: student (Role: Student)');
  }

  // Also ensure 'superadmin' and 'admin' passwords
  const adminUser = await authModels.User.findOne({ where: { username: 'admin', tenant_id: tenant.id } });
  if (adminUser) await adminUser.update({ password_hash: hash, role_id: superAdminRole.id });

  const superadminUser = await authModels.User.findOne({ where: { username: 'superadmin', tenant_id: tenant.id } });
  if (superadminUser) await superadminUser.update({ password_hash: hash, role_id: superAdminRole.id });

  console.log('\n--- 2. Setting up attendances table in college_erp_student ---');
  await studentModels.sequelize.query(`
    CREATE TABLE IF NOT EXISTS "attendances" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenant_id" UUID NOT NULL,
      "student_id" UUID NOT NULL REFERENCES "students" ("id") ON DELETE CASCADE,
      "subject_id" UUID NOT NULL,
      "academic_year_id" UUID NOT NULL,
      "department_id" UUID NOT NULL,
      "staff_id" UUID,
      "date" DATE NOT NULL,
      "status" VARCHAR(20) NOT NULL DEFAULT 'present',
      "remarks" VARCHAR(255),
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "attendances_tenant_student_subject_date_uniq" 
      ON "attendances" ("tenant_id", "student_id", "subject_id", "date");
    CREATE INDEX IF NOT EXISTS "attendances_cohort_idx" 
      ON "attendances" ("tenant_id", "academic_year_id", "department_id", "subject_id", "date");
  `);
  console.log('attendances table verified and ready.');

  // Seed sample attendance records if none exist
  const existingCountRes = await studentModels.sequelize.query('SELECT COUNT(*) FROM "attendances";');
  const count = parseInt(existingCountRes[0][0].count, 10);
  console.log(`Current attendance records: ${count}`);

  if (count === 0 && studentAarav) {
    console.log('Seeding initial attendance history for student demo...');
    const subjectsRes = await studentModels.sequelize.query(
      'SELECT id, code, name FROM "subjects" WHERE tenant_id = $1 AND department_id = $2 LIMIT 4;',
      { bind: [tenant.id, studentAarav.department_id] }
    );
    const subjects = subjectsRes[0];
    const allStudentsRes = await studentModels.sequelize.query(
      'SELECT id, name FROM "students" WHERE tenant_id = $1 AND department_id = $2 AND academic_year_id = $3 LIMIT 10;',
      { bind: [tenant.id, studentAarav.department_id, studentAarav.academic_year_id] }
    );
    const students = allStudentsRes[0];

    const dates = [
      '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'
    ];

    let inserted = 0;
    for (const sub of subjects) {
      for (const d of dates) {
        for (const stu of students) {
          // 85% present, 10% absent, 5% late
          const rand = Math.random();
          const st = rand > 0.15 ? 'present' : (rand > 0.05 ? 'absent' : 'late');
          await studentModels.sequelize.query(`
            INSERT INTO "attendances" ("tenant_id", "student_id", "subject_id", "academic_year_id", "department_id", "staff_id", "date", "status", "remarks")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT ("tenant_id", "student_id", "subject_id", "date") DO NOTHING;
          `, {
            bind: [
              tenant.id,
              stu.id,
              sub.id,
              studentAarav.academic_year_id,
              studentAarav.department_id,
              staffArun ? staffArun.id : null,
              d,
              st,
              st === 'late' ? '10 mins late' : null
            ]
          });
          inserted++;
        }
      }
    }
    console.log(`Seeded ${inserted} sample attendance entries.`);
  }

  console.log('\n SETUP COMPLETED SUCCESSFULLY! ');
}

setup().then(() => process.exit(0)).catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
