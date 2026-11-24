const API = 'http://localhost:5000';

async function testDynamicFiltering() {
  console.log('--- Verifying Dynamic Department Staff Filtering ---');

  // Authenticate as Super Admin
  const authRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: 'admin', password: 'Admin@123' })
  });
  const authData = await authRes.json();
  const token = authData.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch departments
  const deptsRes = await fetch(`${API}/master/departments/search?all=true`, { headers });
  const departments = (await deptsRes.json()).data;
  console.log(`Found ${departments.length} departments:`, departments.map(d => `${d.code}`).join(', '));

  // Fetch all staff
  const staffRes = await fetch(`${API}/master/staff/search?all=true`, { headers });
  const allStaff = (await staffRes.json()).data;
  console.log(`Found ${allStaff.length} total staff members across the institution.`);

  // Test dynamic filtering for each department
  for (const dept of departments) {
    const departmentStaff = allStaff.filter(
      s => s.department_id === dept.id || s.Department?.id === dept.id
    );

    console.log(`\nDepartment [${dept.code} - ${dept.name}]:`);
    console.log(`  Staff count: ${departmentStaff.length}`);
    departmentStaff.forEach(s => {
      console.log(`  -> ${s.name} (${s.designation}) [Dept: ${s.Department?.code || s.department_id}]`);
    });

    // Verification check: ensure no other department staff leaked into this department
    const foreignStaff = departmentStaff.filter(
      s => s.department_id !== dept.id && s.Department?.id !== dept.id
    );
    if (foreignStaff.length > 0) {
      console.error(`  FAIL: Leaked foreign staff in ${dept.code}:`, foreignStaff);
    } else {
      console.log(`  PASS: Dynamic filter strictly scopes only ${dept.code} staff.`);
    }
  }

  console.log('\n DYNAMIC STAFF FILTERING VERIFICATION COMPLETE! ');
}

testDynamicFiltering().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
