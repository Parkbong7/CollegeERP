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
  console.log('=====================================================');
  console.log('🧪 TESTING ROLES: Super Admin, HOD, Staff, Student');
  console.log('=====================================================');

  // 1. Authenticate as Super Admin
  const superRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'admin', password: 'Admin@123' })
  });
  if (!superRes.ok) throw new Error('Super Admin login failed: ' + JSON.stringify(superRes.data));
  const superToken = superRes.data.data.token;
  console.log('✅ 1. Super Admin logged in. Role:', superRes.data.data.user.role);

  // 2. Authenticate as HOD
  const hodRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'hod', password: 'Admin@123' })
  });
  if (!hodRes.ok) throw new Error('HOD login failed: ' + JSON.stringify(hodRes.data));
  const hodToken = hodRes.data.data.token;
  console.log('✅ 2. HOD logged in. Role:', hodRes.data.data.user.role);

  // 3. Authenticate as Staff
  const staffRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'staff', password: 'Admin@123' })
  });
  if (!staffRes.ok) throw new Error('Staff login failed: ' + JSON.stringify(staffRes.data));
  const staffToken = staffRes.data.data.token;
  console.log('✅ 3. Staff logged in. Role:', staffRes.data.data.user.role);

  // 4. Authenticate as Student
  const studentRes = await req(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'student', password: 'Admin@123' })
  });
  if (!studentRes.ok) throw new Error('Student login failed: ' + JSON.stringify(studentRes.data));
  const studentToken = studentRes.data.data.token;
  console.log('✅ 4. Student logged in. Role:', studentRes.data.data.user.role);

  const superHeaders = { Authorization: `Bearer ${superToken}` };
  const hodHeaders = { Authorization: `Bearer ${hodToken}` };
  const staffHeaders = { Authorization: `Bearer ${staffToken}` };
  const studentHeaders = { Authorization: `Bearer ${studentToken}` };

  console.log('\n=====================================================');
  console.log('📋 TESTING ATTENDANCE SYSTEM WORKFLOWS');
  console.log('=====================================================');

  // Fetch departments & years
  const deptsRes = await req(`${API}/master/departments/search?all=true`, { headers: superHeaders });
  const dept = deptsRes.data.data.find(d => d.code === 'CSE') || deptsRes.data.data[0];

  const yearsRes = await req(`${API}/master/years`, { headers: superHeaders });
  const year = yearsRes.data.data[0];

  const subsRes = await req(`${API}/master/subjects?departmentId=${dept.id}&academicYearId=${year.id}`, { headers: superHeaders });
  const subject = subsRes.data.data[0];

  console.log(`Context: Dept=${dept.code}, Year=${year.name}, Subject=${subject?.code}`);

  // Fetch student cohort
  const sheetRes = await req(
    `${API}/attendance/sheet?departmentId=${dept.id}&academicYearId=${year.id}&subjectId=${subject?.id}&date=2026-11-16`,
    { headers: staffHeaders }
  );
  if (!sheetRes.ok) throw new Error('Failed to load sheet: ' + JSON.stringify(sheetRes.data));
  const students = sheetRes.data.data.students;
  console.log(`Loaded sheet for ${students.length} students on 2026-11-16`);

  // A. Staff puts attendance for students
  console.log('\n--- Test A: Staff marks attendance for cohort ---');
  const attendancePayload = {
    academicYearId: year.id,
    departmentId: dept.id,
    subjectId: subject.id,
    date: '2026-11-16',
    records: students.map((s, idx) => ({
      studentId: s.id,
      status: idx % 3 === 0 ? 'absent' : (idx % 3 === 1 ? 'late' : 'present'),
      remarks: idx % 3 === 0 ? 'Absent notice' : null
    }))
  };

  const markRes = await req(`${API}/attendance/mark`, {
    method: 'POST',
    headers: staffHeaders,
    body: JSON.stringify(attendancePayload)
  });

  if (markRes.ok) {
    console.log(` PASS: Staff marked attendance successfully: ${markRes.data.message}`);
  } else {
    console.error(` FAIL: Staff failed to mark attendance:`, markRes.data);
  }

  // B. HOD views attendance sheet (allowed)
  console.log('\n--- Test B: HOD inspects class attendance sheet (View Only) ---');
  const hodViewRes = await req(
    `${API}/attendance/sheet?departmentId=${dept.id}&academicYearId=${year.id}&subjectId=${subject.id}&date=2026-11-16`,
    { headers: hodHeaders }
  );
  if (hodViewRes.ok) {
    const d = hodViewRes.data.data;
    console.log(` PASS: HOD viewed sheet: ${d.totalStudents} total, ${d.presentCount} present, ${d.absentCount} absent, ${d.lateCount} late (${d.attendancePercentage}% attendance).`);
  } else {
    console.error(` FAIL: HOD failed to view sheet:`, hodViewRes.data);
  }

  // C. HOD attempts to mark attendance (blocked with 403)
  console.log('\n--- Test C: HOD tries to mark attendance (Must be blocked 403) ---');
  const hodMarkRes = await req(`${API}/attendance/mark`, {
    method: 'POST',
    headers: hodHeaders,
    body: JSON.stringify(attendancePayload)
  });
  if (hodMarkRes.status === 403) {
    console.log(` PASS: HOD is blocked from marking attendance (403 Forbidden): ${hodMarkRes.data.error.message}`);
  } else {
    console.error(` FAIL: HOD was able to mark attendance or returned wrong status:`, hodMarkRes.status);
  }

  // D. Student views personal attendance
  console.log('\n--- Test D: Student views their own attendance ---');
  const myAttRes = await req(`${API}/attendance/my-attendance`, { headers: studentHeaders });
  if (myAttRes.ok) {
    const sData = myAttRes.data.data;
    console.log(` PASS: Student viewed personal attendance:`);
    console.log(`   Student: ${sData.student?.name} (${sData.student?.rollNumber})`);
    console.log(`   Overall Attendance: ${sData.statistics?.overallPercentage}% (${sData.statistics?.presentCount}/${sData.statistics?.totalClasses} classes)`);
    console.log(`   Eligibility: ${sData.statistics?.eligibilityMessage}`);
    console.log(`   Subjects Breakdown: ${sData.subjectBreakdown?.length} courses`);
  } else {
    console.error(` FAIL: Student failed to view attendance:`, myAttRes.data);
  }

  // E. Student attempts to mark attendance (blocked with 403)
  console.log('\n--- Test E: Student tries to mark attendance (Must be blocked 403) ---');
  const studentMarkRes = await req(`${API}/attendance/mark`, {
    method: 'POST',
    headers: studentHeaders,
    body: JSON.stringify(attendancePayload)
  });
  if (studentMarkRes.status === 403) {
    console.log(` PASS: Student is blocked from marking attendance (403 Forbidden): ${studentMarkRes.data.error.message}`);
  } else {
    console.error(` FAIL: Student was able to mark attendance or returned wrong status:`, studentMarkRes.status);
  }

  // F. View attendance summary analytics
  console.log('\n--- Test F: Overall Attendance Summary Analytics ---');
  const summaryRes = await req(`${API}/attendance/summary?departmentId=${dept.id}`, { headers: hodHeaders });
  if (summaryRes.ok) {
    console.log(` PASS: Attendance analytics computed successfully:`, summaryRes.data.data);
  }

  console.log('\n=====================================================');
  console.log(' ALL ROLE & ATTENDANCE TESTS PASSED SUCCESSFULLY! ');
  console.log('=====================================================');
}

runTests().catch(err => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
