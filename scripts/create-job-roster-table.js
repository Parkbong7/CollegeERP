const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

async function createJobRosterTable() {
  const client = new Client({ connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_department' });
  await client.connect();

  console.log('Creating job_rosters table in college_erp_department...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS job_rosters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      task_title VARCHAR(255) NOT NULL,
      task_description TEXT,
      shift VARCHAR(100) DEFAULT 'Full Day (09:00 - 17:00)',
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(30) DEFAULT 'assigned',
      completion_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_job_rosters_dept_date ON job_rosters(tenant_id, department_id, date);
    CREATE INDEX IF NOT EXISTS idx_job_rosters_staff_date ON job_rosters(tenant_id, staff_id, date);
  `);

  console.log('✓ Table job_rosters created successfully in college_erp_department');

  // Let's also check if college_erp_master needs it or if we can seed initial sample duties for today
  const tenantRes = await client.query("SELECT id FROM tenants WHERE code = 'ABC_ENG' OR code = 'ABC' LIMIT 1");
  const tenantId = tenantRes.rows[0]?.id;

  const cseDept = await client.query("SELECT id FROM departments WHERE code = 'CSE' LIMIT 1");
  const cseDeptId = cseDept.rows[0]?.id;

  const cseStaff = await client.query("SELECT id, name, employee_id FROM staff WHERE department_id = $1 ORDER BY name", [cseDeptId]);

  const hodUser = await client.query("SELECT id FROM users WHERE username = 'hod.cse' OR username = 'hod' LIMIT 1");
  const hodUserId = hodUser.rows[0]?.id;

  const today = new Date().toISOString().split('T')[0];

  console.log(`Seeding sample today roster for ${cseStaff.rows.length} CSE staff on ${today}...`);

  const sampleDuties = [
    {
      taskTitle: 'CS101 Programming Lecture & Lab Practical',
      taskDescription: 'Conduct Morning C-Programming session for Year 1 CSE Batch A, followed by Compiler Lab in Room 204.',
      shift: 'Morning Shift (09:00 - 13:00)',
      priority: 'high',
      status: 'in_progress'
    },
    {
      taskTitle: 'Mid-Semester Answer Sheet Evaluation & Moderation',
      taskDescription: 'Evaluate Discrete Mathematics scripts and compile internal marks sheet by 4:00 PM.',
      shift: 'Afternoon Shift (13:00 - 17:00)',
      priority: 'medium',
      status: 'assigned'
    },
    {
      taskTitle: 'Department Seminar & Industry Guest Lecture In-charge',
      taskDescription: 'Coordinate Auditorium setup, AV systems, and hospitality for visiting Industry Expert Dr. Ramanathan.',
      shift: 'Full Day (09:00 - 17:00)',
      priority: 'urgent',
      status: 'assigned'
    },
    {
      taskTitle: 'Hardware Lab Maintenance & System Audit',
      taskDescription: 'Verify network connectivity, OS updates, and peripheral devices across 40 workstations in Lab 3.',
      shift: 'Morning Shift (09:00 - 13:00)',
      priority: 'medium',
      status: 'completed'
    }
  ];

  for (let i = 0; i < cseStaff.rows.length; i++) {
    const st = cseStaff.rows[i];
    const duty = sampleDuties[i % sampleDuties.length];

    await client.query(`
      INSERT INTO job_rosters (id, tenant_id, department_id, staff_id, assigned_by_user_id, date, task_title, task_description, shift, priority, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [tenantId, cseDeptId, st.id, hodUserId, today, duty.taskTitle, duty.taskDescription, duty.shift, duty.priority, duty.status]);
  }

  console.log(`✓ Seeded sample daily job roster for CSE staff on ${today}`);
  await client.end();
}

createJobRosterTable().catch(console.error);
