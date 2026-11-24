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

async function verify() {
  console.log('====================================================');
  console.log('   COLLEGE ERP - SYSTEM VERIFICATION SUITE');
  console.log('====================================================\n');

  try {
    // 1. Gateway Health Check
    console.log('[1/7] Testing Unified API Gateway (Port 5000)...');
    const health = await req('/health');
    console.log('  ✓ API Gateway Status:', health.status);

    // 2. Auth: ABC Tenant Login
    console.log('\n[2/7] Testing Unified ABC Tenant Authentication...');
    const adminLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        usernameOrEmail: 'ABC',
        password: 'Admin@123'
      })
    });
    const adminToken = adminLogin.data.token;
    const adminTenant = adminLogin.data.tenant;
    console.log('  ✓ Admin logged in successfully.');
    console.log('  ✓ Tenant Scoped:', adminTenant.name, `(Code: ${adminTenant.code})`);

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 3. Tenant Summary
    console.log('\n[3/7] Testing Institutional Summary...');
    const summaryRes = await req('/tenant/summary', { headers: adminHeaders });
    console.log('  ✓ Summary Data:', JSON.stringify(summaryRes.data));

    // 4. Master Module: Academic Years & Eye-icon mapped subjects
    console.log('\n[4/7] Testing Master Module - Academic Years & Year Subjects...');
    const yearsRes = await req('/master/years', { headers: adminHeaders });
    const years = yearsRes.data;
    console.log(`  ✓ Retrieved ${years.length} Academic Years.`);
    if (years.length > 0) {
      const year1 = years[0];
      const subjectsRes = await req(`/master/years/${year1.id}/subjects`, { headers: adminHeaders });
      console.log(`  ✓ Eye-icon view: Year '${year1.name}' has ${subjectsRes.data.subjects.length} mapped subjects.`);
    }

    // 5. Master Module: Staff search & Department overview
    console.log('\n[5/7] Testing Staff Master & Department Master...');
    const staffSearch = await req('/master/staff/search?all=true', { headers: adminHeaders });
    console.log(`  ✓ Staff Search found ${staffSearch.data.length} faculty members.`);

    const deptSearch = await req('/master/departments/search?all=true', { headers: adminHeaders });
    const depts = deptSearch.data;
    console.log(`  ✓ Department Search found ${depts.length} departments.`);
    if (depts.length > 0) {
      const cse = depts[0];
      const deptDetails = await req(`/master/departments/${cse.id}`, { headers: adminHeaders });
      const deptCounts = await req(`/master/departments/${cse.id}/student-counts`, { headers: adminHeaders });
      console.log(`  ✓ Department ${cse.code} HOD: ${deptDetails.data.hodName}, Faculty: ${deptDetails.data.totalStaff}, Students: ${deptDetails.data.totalStudents}`);
      console.log(`  ✓ Student distribution across 4 years:`, deptCounts.data.map(c => `${c.academicYearCode}: ${c.studentCount}`).join(', '));
    }

    // 6. Student Module: Scoped Subject retrieval
    console.log('\n[6/7] Testing Student Module - Scoped Subject Retrieval...');
    const studentsRes = await req('/students/search?all=true', { headers: adminHeaders });
    const students = studentsRes.data;
    console.log(`  ✓ Total enrolled students: ${students.length}`);
    let testStudent = null;
    if (students.length > 0) {
      testStudent = students[0];
      const subRes = await req(`/students/${testStudent.id}/subjects`, { headers: adminHeaders });
      console.log(`  ✓ Student: ${testStudent.name} (Roll: ${testStudent.roll_number})`);
      console.log(`  ✓ Department: ${testStudent.Department?.code}, Year: ${testStudent.AcademicYear?.name}`);
      console.log(`  ✓ HOD: ${subRes.data.student.hodName}, Scoped Subjects count: ${subRes.data.subjects.length}`);
    }

    // 7. Department Module: Workflow 7.1 & 7.2
    console.log('\n[7/7] Testing Department Module Workflows (7.1 & 7.2)...');
    if (testStudent) {
      // 7.1 Student lookup
      const lookupRes = await req(`/departments/student-subject-lookup?rollNumber=${encodeURIComponent(testStudent.roll_number)}`, { headers: adminHeaders });
      console.log(`  ✓ [Workflow 7.1] Lookup ${testStudent.roll_number} -> ${lookupRes.data.student.name}, HOD: ${lookupRes.data.student.hodName}, Subjects: ${lookupRes.data.subjects.length}`);
    }

    // 7.2 HOD staff overview
    const hodOverview = await req('/departments/hod/me/staff', { headers: adminHeaders });
    console.log(`  ✓ [Workflow 7.2] HOD: ${hodOverview.data.hod.name} (${hodOverview.data.department.code}), Faculty in department: ${hodOverview.data.staff.length}`);

    console.log('\n====================================================');
    console.log('   >>> ALL VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

verify();
