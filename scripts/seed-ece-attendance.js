const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

async function seedEceAttendance() {
  const c = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_student' });
  await c.connect();

  const tenantRes = await c.query("SELECT id FROM tenants WHERE code = 'ABC_ENG' OR code = 'ABC' LIMIT 1");
  const tenantId = tenantRes.rows[0]?.id;

  const eceStudents = await c.query("SELECT s.id, s.name, s.department_id, s.academic_year_id FROM students s JOIN departments d ON s.department_id = d.id WHERE d.code = 'ECE' AND s.roll_number ILIKE '%2026%'");
  const eceSubs = await c.query("SELECT s.id, s.code FROM subjects s JOIN departments d ON s.department_id = d.id WHERE d.code = 'ECE' AND (s.code = 'EC101' OR s.code = 'EC102')");
  const eceStaff = await c.query("SELECT s.id FROM staff s JOIN departments d ON s.department_id = d.id WHERE d.code = 'ECE' LIMIT 1");
  const staffId = eceStaff.rows[0]?.id;

  const dates = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-16'];

  let count = 0;
  for (const st of eceStudents.rows) {
    for (const sub of eceSubs.rows) {
      for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        const status = (i === 2) ? 'absent' : (i === 5 ? 'late' : 'present');
        const remarks = (status === 'absent') ? 'Medical leave' : null;

        await c.query(`
          INSERT INTO attendances (id, tenant_id, student_id, subject_id, academic_year_id, department_id, staff_id, date, status, remarks, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (tenant_id, student_id, subject_id, date) DO UPDATE SET
            status = $8, remarks = $9, updated_at = NOW()
        `, [tenantId, st.id, sub.id, st.academic_year_id, st.department_id, staffId, d, status, remarks]);
        count++;
      }
    }
  }

  console.log(`✓ Seeded ${count} attendance records for ECE students`);
  await c.end();
}

seedEceAttendance().catch(console.error);
