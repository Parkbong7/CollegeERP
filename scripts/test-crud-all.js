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
    throw new Error(`[${res.status}] ${data.error?.message || data.message || JSON.stringify(data)}`);
  }
  return data;
}

async function runCrudTest() {
  console.log('===============================================================');
  console.log('   FULL END-TO-END CRUD (FETCH & INSERT) VERIFICATION SUITE');
  console.log('===============================================================\n');

  // 1. Auth & Token
  console.log('[1/5] Testing Auth & Tenant Access...');
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'ABC', password: 'Admin@123' })
  });
  const token = loginRes.data.token;
  const headers = { Authorization: `Bearer ${token}` };
  console.log('  ✓ Login successful. User:', loginRes.data.user.name, '| Role:', loginRes.data.user.role);

  const meRes = await req('/auth/me', { headers });
  console.log('  ✓ GET /auth/me -> Verified:', meRes.data.user.email);

  const tenantRes = await req('/tenant/current', { headers });
  console.log('  ✓ GET /tenant/current -> Tenant:', tenantRes.data.name, `(${tenantRes.data.code})`);

  const summaryRes = await req('/tenant/summary', { headers });
  console.log('  ✓ GET /tenant/summary -> Total Students:', summaryRes.data.totalStudents, '| Staff:', summaryRes.data.totalStaff, '| Depts:', summaryRes.data.totalDepartments);

  // 2. Master Module: Fetch & Insert
  console.log('\n[2/5] Testing Master Module (Fetch & Insert)...');
  
  // 2a. Academic Years
  const yearsRes = await req('/master/years', { headers });
  console.log(`  ✓ GET /master/years -> Found ${yearsRes.data.length} academic years`);
  const testYearCode = `TEST_Y_${Date.now().toString().slice(-4)}`;
  const newYearRes = await req('/master/years', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: testYearCode,
      name: `Test Year ${testYearCode}`,
      startDate: '2026-08-01',
      endDate: '2027-05-31'
    })
  });
  console.log(`  ✓ POST /master/years -> Successfully created year '${newYearRes.data.name}' (ID: ${newYearRes.data.id})`);
  const yearId = newYearRes.data.id;

  // 2b. Departments
  const deptsRes = await req('/master/departments/search?all=true', { headers });
  console.log(`  ✓ GET /master/departments/search -> Found ${deptsRes.data.length} departments`);
  const testDeptCode = `T_${Date.now().toString().slice(-4)}`;
  const newDeptRes = await req('/master/departments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: testDeptCode,
      name: `Department of Test Engineering ${testDeptCode}`,
      description: 'Temporary department created for CRUD automated verification'
    })
  });
  console.log(`  ✓ POST /master/departments -> Successfully created dept '${newDeptRes.data.name}' (ID: ${newDeptRes.data.id})`);
  const deptId = newDeptRes.data.id;

  // 2c. Staff
  const staffRes = await req('/master/staff/search?all=true', { headers });
  console.log(`  ✓ GET /master/staff/search -> Found ${staffRes.data.length} staff members`);
  const testEmpId = `EMP_${Date.now().toString().slice(-5)}`;
  const newStaffRes = await req('/master/staff', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Dr. Test Faculty',
      employeeId: testEmpId,
      departmentId: deptId,
      email: `test.faculty.${testEmpId.toLowerCase()}@abccollege.edu`,
      phone: '9876543210',
      designation: 'Assistant Professor'
    })
  });
  console.log(`  ✓ POST /master/staff -> Successfully created faculty '${newStaffRes.data.name}' (EmpID: ${newStaffRes.data.employee_id})`);

  // 2d. Subjects (Created & Verified via Year Subjects)
  const testSubCode = `SUB_${Date.now().toString().slice(-4)}`;
  const newSubRes = await req('/master/subjects', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      departmentId: deptId,
      academicYearId: yearId,
      code: testSubCode,
      name: `Advanced Systems Verification ${testSubCode}`,
      semester: 'Semester 1',
      credits: 4
    })
  });
  console.log(`  ✓ POST /master/subjects -> Successfully created subject '${newSubRes.data.name}' (Code: ${newSubRes.data.code})`);
  const subjectId = newSubRes.data.id;

  const yearSubjectsRes = await req(`/master/years/${yearId}/subjects`, { headers });
  console.log(`  ✓ GET /master/years/:id/subjects -> Verified mapped subjects count for year: ${yearSubjectsRes.data.subjects.length}`);

  // 2e. Update Subject
  const updateSubRes = await req(`/master/subjects/${subjectId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ credits: 5 })
  });
  console.log(`  ✓ PUT /master/subjects/:id -> Updated subject credits: ${updateSubRes.data.credits}`);

  // 3. Student Module: Fetch & Insert & Update
  console.log('\n[3/5] Testing Student Module (Fetch & Insert & Update)...');
  const testRoll = `ROLL_${Date.now().toString().slice(-5)}`;
  const newStudentRes = await req('/students', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Test Student Automated',
      rollNumber: testRoll,
      departmentId: deptId,
      academicYearId: yearId,
      email: `student.${testRoll.toLowerCase()}@student.abccollege.edu`,
      phone: '9123456789',
      semester: 'Semester 1',
      cgpa: 9.1
    })
  });
  const createdStudentId = newStudentRes.data.id;
  console.log(`  ✓ POST /students (Enrollment) -> Created student '${newStudentRes.data.name}' (Roll: ${newStudentRes.data.roll_number}, ID: ${createdStudentId})`);

  // 3b. Fetch newly created student by ID
  const fetchStudentRes = await req(`/students/${createdStudentId}`, { headers });
  console.log(`  ✓ GET /students/:id -> Successfully fetched: '${fetchStudentRes.data.name}', Department: ${fetchStudentRes.data.department}, Year: ${fetchStudentRes.data.academicYear}, HOD: ${fetchStudentRes.data.hodName}`);

  // 3c. Fetch subjects for newly created student
  const fetchSubRes = await req(`/students/${createdStudentId}/subjects`, { headers });
  console.log(`  ✓ GET /students/:id/subjects -> Retrieved ${fetchSubRes.data.subjects.length} scoped subjects for student`);

  // 3d. Update student (e.g. update CGPA or phone)
  const updateStudentRes = await req(`/students/${createdStudentId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: 'Test Student Automated (Updated)',
      cgpa: 9.4
    })
  });
  console.log(`  ✓ PUT /students/:id -> Updated student name: '${updateStudentRes.data.name}', CGPA: ${updateStudentRes.data.cgpa}`);

  // 3e. Search students with filter
  const searchRollRes = await req(`/students/search?rollNumber=${testRoll}`, { headers });
  console.log(`  ✓ GET /students/search?rollNumber=${testRoll} -> Found ${searchRollRes.data.length} match(es)`);

  // 4. Department Module: Lookup & Workflow verification
  console.log('\n[4/5] Testing Department Module...');
  const lookupRes = await req(`/departments/student-subject-lookup?rollNumber=${testRoll}`, { headers });
  console.log(`  ✓ GET /departments/student-subject-lookup (by rollNumber) -> Student: ${lookupRes.data.student.name}, Dept: ${lookupRes.data.department.code}, Subjects count: ${lookupRes.data.subjects.length}`);

  const hodListRes = await req('/departments/hod/list', { headers });
  console.log(`  ✓ GET /departments/hod/list -> Found ${hodListRes.data.length} HOD assignments`);

  const hodMeRes = await req('/departments/hod/me/staff', { headers });
  console.log(`  ✓ GET /departments/hod/me/staff -> HOD: ${hodMeRes.data.hod.name}, Faculty count: ${hodMeRes.data.staff.length}`);

  // 5. Cleanup test records
  console.log('\n[5/5] Cleaning up test records...');
  await req(`/students/${createdStudentId}`, { method: 'DELETE', headers });
  console.log(`  ✓ DELETE /students/:id -> Cleaned up test student.`);
  await req(`/master/subjects/${subjectId}`, { method: 'DELETE', headers });
  console.log(`  ✓ DELETE /master/subjects/:id -> Cleaned up test subject.`);
  await req(`/master/years/${yearId}`, { method: 'DELETE', headers });
  console.log(`  ✓ DELETE /master/years/:id -> Cleaned up test year.`);

  console.log('\n===============================================================');
  console.log('   >>> ALL CRUD (FETCH & INSERT) CHECKS PASSED 100%! <<<');
  console.log('===============================================================\n');
}

runCrudTest().catch(err => {
  console.error('\n❌ CRUD Verification Error:', err.message);
  process.exit(1);
});
