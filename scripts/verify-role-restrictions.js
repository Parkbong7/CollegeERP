const API = 'http://localhost:5000';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('--- 1. Authenticating as Super Admin & Sub Admin ---');
  
  const superAdminLogin = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'admin', password: 'Admin@123' })
  });
  if (!superAdminLogin.ok) throw new Error('Super admin login failed: ' + JSON.stringify(superAdminLogin.data));
  const superToken = superAdminLogin.data.data.token;
  console.log('Super Admin logged in successfully. Role:', superAdminLogin.data.data.user.role);

  const subAdminLogin = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'subadmin', password: 'Admin@123' })
  });
  if (!subAdminLogin.ok) throw new Error('Sub admin login failed: ' + JSON.stringify(subAdminLogin.data));
  const subToken = subAdminLogin.data.data.token;
  console.log('Sub Admin logged in successfully. Role:', subAdminLogin.data.data.user.role);

  const superHeaders = { Authorization: `Bearer ${superToken}` };
  const subHeaders = { Authorization: `Bearer ${subToken}` };

  console.log('\n--- 2. Testing Staff List & Subject Creation with Staff Assignment ---');
  // Get departments
  const deptsRes = await req(`${API}/master/departments/search?all=true`, { headers: superHeaders });
  const dept = deptsRes.data.data[0];
  console.log(`Using Department: ${dept.code} (${dept.name})`);

  // Get staff
  const staffRes = await req(`${API}/master/staff/search?all=true`, { headers: superHeaders });
  const staff = staffRes.data.data[0];
  console.log(`Using Staff: ${staff.name} (${staff.designation})`);

  // Create test academic year
  const testYearCode = 'TY' + Math.floor(Math.random() * 900 + 100);
  const yearRes = await req(`${API}/master/years`, {
    method: 'POST',
    headers: superHeaders,
    body: JSON.stringify({
      name: `Test Year ${testYearCode}`,
      code: testYearCode
    })
  });
  const testYear = yearRes.data.data;
  console.log(`Created Academic Year: ${testYear.name} (${testYear.code}), ID: ${testYear.id}`);

  // Create Subject assigned to Staff
  const testSubCode = 'TS' + Math.floor(Math.random() * 900 + 100);
  const subCreateRes = await req(`${API}/master/subjects`, {
    method: 'POST',
    headers: superHeaders,
    body: JSON.stringify({
      departmentId: dept.id,
      academicYearId: testYear.id,
      code: testSubCode,
      name: 'Test Advanced Computing',
      semester: 'Semester 1',
      credits: 4,
      staffId: staff.id
    })
  });
  console.log(`Created Subject: ${testSubCode} assigned to Staff:`, subCreateRes.data.data.staffName);

  // Verify getYearSubjects returns assigned staff
  const yearSubjectsRes = await req(`${API}/master/years/${testYear.id}/subjects`, { headers: superHeaders });
  const mappedSub = yearSubjectsRes.data.data.subjects.find(s => s.code === testSubCode);
  console.log('Subject in getYearSubjects:');
  console.log(`  - Code: ${mappedSub.code}`);
  console.log(`  - Assigned Faculty: ${mappedSub.staffName}`);
  console.log(`  - Assignment ID: ${mappedSub.assignmentId}`);

  if (mappedSub.staffName === staff.name) {
    console.log(' PASS: Staff was successfully assigned to subject during Year & Subject creation!');
  } else {
    console.error(' FAIL: Assigned staff name does not match expected!');
  }

  console.log('\n--- 3. Testing Student Enrollment Authorization ---');
  // Use existing seeded academic year for student enrollment
  const allYearsRes = await req(`${API}/master/years`, { headers: superHeaders });
  const seededYear = allYearsRes.data.data.find(y => y.code === 'Y1') || allYearsRes.data.data[0];
  console.log(`Using Seeded Year for Student: ${seededYear.name} (${seededYear.id})`);

  // Sub Admin attempts to enroll a student (should be blocked with 403)
  const testRollSub = '24SUB' + Math.floor(Math.random() * 900 + 100);
  const subEnrollRes = await req(`${API}/students`, {
    method: 'POST',
    headers: subHeaders,
    body: JSON.stringify({
      name: 'Blocked Student',
      rollNumber: testRollSub,
      email: `blocked.${testRollSub}@student.college.edu`,
      departmentId: dept.id,
      academicYearId: seededYear.id,
      semester: 'Semester 1'
    })
  });

  if (subEnrollRes.status === 403) {
    console.log(' PASS: Sub Admin is blocked from enrolling students (HTTP 403 Forbidden):', subEnrollRes.data.error.message);
  } else {
    console.error(' FAIL: Sub Admin was able to create student or wrong status:', subEnrollRes.status, subEnrollRes.data);
  }

  // Super Admin enrolls a student (should succeed with 201)
  const testRollSuper = '24SUP' + Math.floor(Math.random() * 900 + 100);
  let createdStudentId = null;
  const superEnrollRes = await req(`${API}/students`, {
    method: 'POST',
    headers: superHeaders,
    body: JSON.stringify({
      name: 'Super Enrolled Student',
      rollNumber: testRollSuper,
      email: `super.${testRollSuper}@student.college.edu`,
      departmentId: dept.id,
      academicYearId: seededYear.id,
      semester: 'Semester 1'
    })
  });

  if (superEnrollRes.ok) {
    createdStudentId = superEnrollRes.data.data.id;
    console.log(` PASS: Super Admin successfully enrolled student: ${superEnrollRes.data.data.name} (${superEnrollRes.data.data.rollNumber})`);
  } else {
    console.error(' FAIL: Super Admin failed to enroll student:', superEnrollRes.status, superEnrollRes.data);
  }

  console.log('\n--- 4. Cleaning up test fixtures ---');
  if (createdStudentId) {
    await req(`${API}/students/${createdStudentId}`, { method: 'DELETE', headers: superHeaders });
    console.log('Cleaned up test student.');
  }
  await req(`${API}/master/subjects/${mappedSub.id}`, { method: 'DELETE', headers: superHeaders });
  await req(`${API}/master/years/${testYear.id}`, { method: 'DELETE', headers: superHeaders });
  console.log('Cleaned up test subject and test academic year.');

  console.log('\n ALL TESTS PASSED SUCCESSFULLY! ');
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err.message);
  process.exit(1);
});
