const BASE_URL = 'http://localhost:5000';

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`[${res.status}] ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

async function testLiveMasterUpdates() {
  console.log('====================================================');
  console.log('   TESTING LIVE MASTER CREATION & DROPDOWN SYNC');
  console.log('====================================================\n');

  try {
    // 1. Authenticate as ABC Tenant
    const login = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail: 'ABC', password: 'Admin@123' })
    });
    const headers = { Authorization: `Bearer ${login.data.token}` };
    console.log('✓ Logged in as ABC Tenant');

    // 2. Initial Department count
    const initialDepts = await req('/master/departments/search?all=true', { headers });
    console.log(`✓ Initial Department count: ${initialDepts.data.length} (${initialDepts.data.map(d => d.code).join(', ')})`);

    // 3. Create a brand new Department: AI & Data Science (AIDS)
    console.log('\n[Action 1] Creating new department: AIDS (Artificial Intelligence & Data Science)...');
    const newDeptRes = await req('/master/departments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: 'AIDS',
        name: 'Artificial Intelligence & Data Science',
        description: 'Advanced AI and Neural Computing'
      })
    });
    const newDept = newDeptRes.data;
    console.log(`✓ Created Department: ${newDept.code} (ID: ${newDept.id})`);

    // 4. Verify department immediately appears in all department dropdown queries
    const updatedDepts = await req('/master/departments/search?all=true', { headers });
    console.log(`✓ Updated Department count: ${updatedDepts.data.length} (${updatedDepts.data.map(d => d.code).join(', ')})`);
    const exists = updatedDepts.data.some(d => d.code === 'AIDS');
    if (!exists) throw new Error('New department did not immediately appear in department list!');
    console.log('  -> Live verification passed: AIDS is immediately available in all dropdowns!');

    // 5. Add a new faculty member and assign to AIDS
    console.log('\n[Action 2] Adding new faculty member: Dr. Rajesh Kannan...');
    const newStaffRes = await req('/master/staff', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Dr. Rajesh Kannan',
        employeeId: 'STF-0401',
        departmentId: newDept.id,
        designation: 'Professor & HOD',
        email: 'rajesh.k@abccollege.edu',
        phone: '+91 98765 11223'
      })
    });
    const newStaff = newStaffRes.data;
    console.log(`✓ Created Faculty: ${newStaff.name} (${newStaff.employee_id})`);

    // 6. Assign Dr. Rajesh Kannan as HOD of AIDS
    console.log('\n[Action 3] Assigning Dr. Rajesh Kannan as HOD of AIDS...');
    const assignRes = await req(`/master/departments/${newDept.id}/assign-hod`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ staffId: newStaff.id })
    });
    console.log(`✓ ${assignRes.message}`);

    // 7. Verify Department HOD list immediately reflects the new department and HOD
    const hodList = await req('/departments/hod/list', { headers });
    console.log(`✓ HOD List now has ${hodList.data.length} HODs:`, hodList.data.map(h => `${h.departmentCode}: ${h.staffName}`).join(', '));
    const hodAssigned = hodList.data.some(h => h.departmentCode === 'AIDS' && h.staffName === 'Dr. Rajesh Kannan');
    if (!hodAssigned) throw new Error('New HOD assignment did not immediately appear in HOD list!');
    console.log('  -> Live verification passed: AIDS HOD is immediately reflected in HOD list and Department overview!');

    // 8. Add a new Academic Year: Year 5
    console.log('\n[Action 4] Creating new Academic Year: Year 5...');
    const newYearRes = await req('/master/years', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: 'Y5',
        name: 'Year 5',
        startDate: '2026-08-01',
        endDate: '2027-05-31'
      })
    });
    console.log(`✓ Created Academic Year: ${newYearRes.data.name} (${newYearRes.data.code})`);

    // 9. Verify Year dropdown query immediately includes Year 5
    const yearsList = await req('/master/years', { headers });
    console.log(`✓ Academic Years count: ${yearsList.data.length} (${yearsList.data.map(y => y.name).join(', ')})`);
    const yearExists = yearsList.data.some(y => y.code === 'Y5');
    if (!yearExists) throw new Error('New academic year did not immediately appear in years list!');
    console.log('  -> Live verification passed: Year 5 is immediately available in all year dropdowns!');

    console.log('\n====================================================');
    console.log('   >>> ALL LIVE MASTER TESTS PASSED 100%! <<<');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

testLiveMasterUpdates();
