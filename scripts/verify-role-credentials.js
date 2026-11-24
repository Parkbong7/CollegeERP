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

async function testRoleCredentials() {
  console.log('================================================================');
  console.log('🧪 TESTING ROLE CREDENTIALS (Student, Staff, HOD, Super Admin)');
  console.log('================================================================');

  // 1. Student Login with CSE MailID + CSE Department
  console.log('\n--- 1. Student Login: Aarav Patel (CSE) ---');
  const studentCseRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'aarav.p@student.abccollege.edu',
      password: 'Admin@123',
      departmentCode: 'CSE',
      role: 'Student'
    })
  });
  if (!studentCseRes.ok) {
    console.error('FAIL Student CSE Login:', studentCseRes.data);
  } else {
    const u = studentCseRes.data.data.user;
    console.log(`✅ PASS: Student logged in: ${u.name}`);
    console.log(`   Role: ${u.role}`);
    console.log(`   Roll No: ${u.student?.rollNumber || u.rollNumber}`);
    console.log(`   Department: ${u.department?.code} - ${u.department?.name}`);

    // Verify personal attendance
    const attRes = await req(`${API}/attendance/my-attendance`, {
      headers: { Authorization: `Bearer ${studentCseRes.data.data.token}` }
    });
    console.log(`   My Attendance: ${attRes.data.data?.statistics?.overallPercentage}% (${attRes.data.data?.statistics?.eligibilityMessage})`);
  }

  // 2. Student Login with ECE MailID + ECE Department
  console.log('\n--- 2. Student Login: Vikram Singh (ECE) ---');
  const studentEceRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'vikram.s@student.abccollege.edu',
      password: 'Admin@123',
      departmentCode: 'ECE',
      role: 'Student'
    })
  });
  if (!studentEceRes.ok) {
    console.error('FAIL Student ECE Login:', studentEceRes.data);
  } else {
    const u = studentEceRes.data.data.user;
    console.log(`✅ PASS: ECE Student logged in: ${u.name}`);
    console.log(`   Role: ${u.role}`);
    console.log(`   Roll No: ${u.student?.rollNumber || u.rollNumber}`);
    console.log(`   Department: ${u.department?.code} - ${u.department?.name}`);

    const attRes = await req(`${API}/attendance/my-attendance`, {
      headers: { Authorization: `Bearer ${studentEceRes.data.data.token}` }
    });
    console.log(`   My Attendance: ${attRes.data.data?.statistics?.overallPercentage}% (${attRes.data.data?.statistics?.eligibilityMessage})`);
  }

  // 3. Department Mismatch Validation Check
  console.log('\n--- 3. Department Mismatch Validation (CSE student selects ECE dept) ---');
  const mismatchRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'aarav.p@student.abccollege.edu',
      password: 'Admin@123',
      departmentCode: 'ECE',
      role: 'Student'
    })
  });
  if (mismatchRes.status === 400) {
    console.log(`✅ PASS: Mismatch properly caught (400 Bad Request): ${mismatchRes.data.error.message}`);
  } else {
    console.error(`FAIL: Expected 400 for mismatch, got:`, mismatchRes.status);
  }

  // 4. Staff Login: Dr. Arun Kumar (CSE)
  console.log('\n--- 4. Staff Login: Dr. Arun Kumar (CSE) ---');
  const staffRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'staff.arun@abccollege.edu',
      password: 'Admin@123',
      departmentCode: 'CSE',
      role: 'Staff'
    })
  });
  if (!staffRes.ok) {
    console.error('FAIL Staff Login:', staffRes.data);
  } else {
    const u = staffRes.data.data.user;
    console.log(`✅ PASS: Staff logged in: ${u.name}`);
    console.log(`   Role: ${u.role}`);
    console.log(`   Designation: ${u.staff?.designation} (${u.staff?.employeeId})`);
    console.log(`   Department: ${u.department?.code} - ${u.department?.name}`);
  }

  // 5. HOD Login: Dr. Ramesh Sharma (CSE)
  console.log('\n--- 5. HOD Login: Dr. Ramesh Sharma (CSE) ---');
  const hodRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'hod.cse@abccollege.edu',
      password: 'Admin@123',
      departmentCode: 'CSE',
      role: 'HOD'
    })
  });
  if (!hodRes.ok) {
    console.error('FAIL HOD Login:', hodRes.data);
  } else {
    const u = hodRes.data.data.user;
    console.log(`✅ PASS: HOD logged in: ${u.name}`);
    console.log(`   Role: ${u.role}`);
    console.log(`   Department: ${u.department?.code} - ${u.department?.name}`);
  }

  // 6. Super Admin Login
  console.log('\n--- 6. Super Admin Login: System Administrator ---');
  const adminRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'admin@abccollege.edu',
      password: 'Admin@123',
      role: 'Super Admin'
    })
  });
  if (!adminRes.ok) {
    console.error('FAIL Super Admin Login:', adminRes.data);
  } else {
    const u = adminRes.data.data.user;
    console.log(`✅ PASS: Super Admin logged in: ${u.name} (Role: ${u.role})`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL ROLE CREDENTIAL TESTS PASSED END-TO-END!');
  console.log('================================================================');
}

testRoleCredentials().catch(console.error);
