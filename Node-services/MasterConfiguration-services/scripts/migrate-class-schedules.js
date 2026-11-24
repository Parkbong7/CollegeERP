const masterSequelize = require('../config/db.config');
const deptSequelize = require('../../Department-services/config/db.config');

const createTableSql = `
  CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    department_id UUID NOT NULL,
    academic_year_id UUID NOT NULL,
    semester VARCHAR(50) NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    period_number INTEGER NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    subject_id UUID,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    staff_id UUID,
    staff_name VARCHAR(255),
    room_number VARCHAR(100) DEFAULT 'Lecture Hall 101',
    schedule_type VARCHAR(50) DEFAULT 'Lecture',
    status VARCHAR(50) DEFAULT 'published',
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_class_schedules_lookup 
  ON class_schedules (tenant_id, department_id, academic_year_id, semester);
`;

async function main() {
  console.log('Migrating class_schedules table...');
  await masterSequelize.query(createTableSql);
  console.log('✅ college_erp_master class_schedules table ready!');

  await deptSequelize.query(createTableSql);
  console.log('✅ college_erp_department class_schedules table ready!');

  console.log('🎉 Migrations complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
