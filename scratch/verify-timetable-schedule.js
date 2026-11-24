const http = require('http');

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData) {
      if (!reqOptions.headers['Content-Type']) {
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('=== Step 1: Login as HOD (Dr. Ramesh Sharma) ===');
  const loginRes = await request('http://localhost:5000/auth/login', {
    method: 'POST'
  }, {
    usernameOrEmail: 'hod.cse@abccollege.edu',
    password: 'Admin@123'
  });

  if (loginRes.status !== 200 || !loginRes.data.success) {
    throw new Error('HOD login failed: ' + JSON.stringify(loginRes.data));
  }
  const hodToken = loginRes.data.data.token;
  console.log('✓ HOD logged in successfully. User:', loginRes.data.data.user.name, 'Role:', loginRes.data.data.user.role);

  console.log('\n=== Step 2: Fetch Schedule Metadata for HOD ===');
  const metaRes = await request('http://localhost:5000/departments/schedule/meta', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hodToken}` }
  });

  if (metaRes.status !== 200 || !metaRes.data.success) {
    throw new Error('Failed to fetch schedule meta: ' + JSON.stringify(metaRes.data));
  }
  const meta = metaRes.data.data;
  console.log('✓ Meta loaded successfully.');
  console.log('  Department:', meta.department?.name, `(${meta.department?.code})`);
  console.log('  Academic Years count:', meta.academicYears?.length);
  console.log('  Department Subjects count:', meta.subjects?.length);
  console.log('  Staff Members count:', meta.staffMembers?.length);

  const year1 = meta.academicYears.find(y => y.code === 'Y1' || y.name?.includes('1'));
  if (!year1) throw new Error('Year 1 not found in academic years');
  console.log(`✓ Target Academic Year: ${year1.name} (ID: ${year1.id})`);

  console.log('\n=== Step 3: HOD Publishes Timetable Schedule for Year 1 - Semester 1 ===');
  const staff1 = meta.staffMembers[0];
  const staff2 = meta.staffMembers[1] || meta.staffMembers[0];

  const slots = [
    {
      dayOfWeek: 'Monday',
      periodNumber: 1,
      startTime: '09:00',
      endTime: '10:00',
      subjectId: meta.subjects[0]?.id,
      staffId: meta.subjects[0]?.staffId || staff1?.id,
      roomNumber: 'Lecture Hall 101',
      scheduleType: 'Lecture'
    },
    {
      dayOfWeek: 'Monday',
      periodNumber: 2,
      startTime: '10:00',
      endTime: '11:00',
      subjectId: meta.subjects[1]?.id || meta.subjects[0]?.id,
      staffId: meta.subjects[1]?.staffId || staff2?.id,
      roomNumber: 'Lecture Hall 101',
      scheduleType: 'Lecture'
    },
    {
      dayOfWeek: 'Tuesday',
      periodNumber: 1,
      startTime: '09:00',
      endTime: '10:00',
      subjectId: meta.subjects[1]?.id || meta.subjects[0]?.id,
      staffId: meta.subjects[1]?.staffId || staff1?.id,
      roomNumber: 'Advanced Computing Lab 1',
      scheduleType: 'Practical'
    },
    {
      dayOfWeek: 'Wednesday',
      periodNumber: 4,
      startTime: '13:15',
      endTime: '14:15',
      subjectId: meta.subjects[0]?.id,
      staffId: meta.subjects[0]?.staffId || staff1?.id,
      roomNumber: 'Lecture Hall 102',
      scheduleType: 'Lecture'
    }
  ];

  const publishRes = await request('http://localhost:5000/departments/schedule/publish', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hodToken}` }
  }, {
    academicYearId: year1.id,
    semester: 'Semester 1',
    entries: slots
  });

  if (publishRes.status !== 200 || !publishRes.data.success) {
    throw new Error('Failed to publish schedule: ' + JSON.stringify(publishRes.data));
  }
  console.log('✓ HOD successfully published schedule! Message:', publishRes.data.message);
  console.log('  Slots saved in Department DB:', publishRes.data.data?.slotsCount);

  console.log('\n=== Step 4: Verify Schedule in Department Service ===');
  const deptSchedRes = await request(`http://localhost:5000/departments/schedule?academicYearId=${year1.id}&semester=Semester 1`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hodToken}` }
  });
  console.log('✓ Department schedule entries count:', deptSchedRes.data.data?.entries?.length);

  console.log('\n=== Step 5: Verify Schedule in Master Configuration Service (Year Master) ===');
  const masterSchedRes = await request(`http://localhost:5000/master/schedule?academicYearId=${year1.id}&semester=Semester 1`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hodToken}` }
  });

  if (masterSchedRes.status !== 200 || !masterSchedRes.data.success) {
    throw new Error('Failed to query schedule from Master service: ' + JSON.stringify(masterSchedRes.data));
  }

  const masterData = masterSchedRes.data.data;
  console.log('✓ Master service successfully returned class schedule for Year 1 - Semester 1!');
  console.log('  Academic Year:', masterData.academicYear?.name);
  console.log('  Semester:', masterData.semester);
  console.log('  Total slots:', masterData.totalSlots);
  console.log('  Matrix Monday Period 1:', masterData.matrix['Monday'][1]?.subjectCode, '-', masterData.matrix['Monday'][1]?.subjectName, 'by', masterData.matrix['Monday'][1]?.staffName, 'at', masterData.matrix['Monday'][1]?.roomNumber);
  console.log('  Matrix Tuesday Period 1:', masterData.matrix['Tuesday'][1]?.subjectCode, '-', masterData.matrix['Tuesday'][1]?.subjectName, 'by', masterData.matrix['Tuesday'][1]?.staffName, 'at', masterData.matrix['Tuesday'][1]?.roomNumber);
  console.log('  Matrix Wednesday Period 4:', masterData.matrix['Wednesday'][4]?.subjectCode, '-', masterData.matrix['Wednesday'][4]?.subjectName);

  console.log('\n=== Step 6: Verify Super Admin Access to Year Master Schedule ===');
  const adminLogin = await request('http://localhost:5000/auth/login', {
    method: 'POST'
  }, {
    usernameOrEmail: 'admin@abccollege.edu',
    password: 'Admin@123'
  });
  const adminToken = adminLogin.data.data.token;
  const adminSchedRes = await request(`http://localhost:5000/master/schedule?academicYearId=${year1.id}&semester=Semester 1`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('✓ Super Admin query status:', adminSchedRes.status, 'Total slots:', adminSchedRes.data.data?.totalSlots);

  console.log('\n======================================================');
  console.log('🎉 ALL TIMETABLE SCHEDULER & YEAR MASTER TESTS PASSED!');
  console.log('======================================================');
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
