const path = require('path');
require(path.resolve(__dirname, '../Node-services/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../Node-services/.env') });
const models = require('../Node-services/Department-services/models');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

async function seedRichData() {
  try {
    const tenant = await models.Tenant.findOne();
    if (!tenant) throw new Error('No tenant found');
    const tenantId = tenant.id;

    console.log('Seeding for Tenant:', tenant.name, tenantId);

    const depts = await models.Department.findAll({ where: { tenant_id: tenantId } });
    const years = await models.AcademicYear.findAll({ where: { tenant_id: tenantId }, order: [['name', 'ASC']] });

    const deptMap = {};
    depts.forEach(d => { deptMap[d.code] = d; });

    const yearMap = {};
    years.forEach(y => { yearMap[y.name] = y; });

    // 1. Ensure AIDS has subjects and staff assignments
    const aidsDept = deptMap['AIDS'];
    if (aidsDept) {
      const aidsSubjects = [
        { code: 'AD101', name: 'Foundations of AI & Python', year: 'Year 1', credits: 4, sem: 'Semester 1' },
        { code: 'AD102', name: 'Discrete Mathematics for Data Science', year: 'Year 1', credits: 4, sem: 'Semester 2' },
        { code: 'AD201', name: 'Data Structures & Algorithms', year: 'Year 2', credits: 4, sem: 'Semester 3' },
        { code: 'AD202', name: 'Applied Statistics & Probability', year: 'Year 2', credits: 3, sem: 'Semester 3' },
        { code: 'AD203', name: 'Database Systems for Big Data', year: 'Year 2', credits: 3, sem: 'Semester 4' },
        { code: 'AD301', name: 'Machine Learning & Pattern Recognition', year: 'Year 3', credits: 4, sem: 'Semester 5' },
        { code: 'AD302', name: 'Deep Learning & Neural Networks', year: 'Year 3', credits: 4, sem: 'Semester 6' },
        { code: 'AD303', name: 'Natural Language Processing', year: 'Year 3', credits: 3, sem: 'Semester 6' },
        { code: 'AD401', name: 'Computer Vision & Generative AI', year: 'Year 4', credits: 4, sem: 'Semester 7' },
        { code: 'AD402', name: 'Cloud Computing & MLOps Infrastructure', year: 'Year 4', credits: 4, sem: 'Semester 8' }
      ];

      // Find or create staff in AIDS
      let aidsStaff = await models.Staff.findOne({ where: { department_id: aidsDept.id, tenant_id: tenantId } });
      if (!aidsStaff) {
        aidsStaff = await models.Staff.create({
          id: uuidv4(),
          tenant_id: tenantId,
          department_id: aidsDept.id,
          employee_id: 'STF-AD01',
          name: 'Dr. Rajesh Kannan',
          email: 'rajesh.kannan@abccollege.edu',
          phone: '9845123450',
          designation: 'Professor & HOD',
          status: 'active'
        });
      }

      for (const s of aidsSubjects) {
        const y = yearMap[s.year];
        if (!y) continue;
        let sub = await models.Subject.findOne({ where: { code: s.code, tenant_id: tenantId } });
        if (!sub) {
          sub = await models.Subject.create({
            id: uuidv4(),
            tenant_id: tenantId,
            department_id: aidsDept.id,
            academic_year_id: y.id,
            code: s.code,
            name: s.name,
            credits: s.credits,
            semester: s.sem,
            status: 'active'
          });
          // Assign faculty
          await models.StaffSubjectAssignment.create({
            id: uuidv4(),
            tenant_id: tenantId,
            staff_id: aidsStaff.id,
            subject_id: sub.id,
            academic_year_id: y.id,
            department_id: aidsDept.id,
            semester: s.sem,
            is_active: true
          });
        }
      }
      console.log('AIDS subjects & faculty verified');
    }

    // 2. Comprehensive Student Roster for ALL Departments & ALL Years
    const studentData = {
      AIDS: {
        'Year 1': [
          { name: 'Aditi Sharma', roll: '26AD001', email: 'aditi.ad26@student.abccollege.edu' },
          { name: 'Karthik Raja', roll: '26AD002', email: 'karthik.ad26@student.abccollege.edu' },
          { name: 'Sneha Narayanan', roll: '26AD003', email: 'sneha.ad26@student.abccollege.edu' },
          { name: 'Rohan Mehra', roll: '26AD004', email: 'rohan.ad26@student.abccollege.edu' }
        ],
        'Year 2': [
          { name: 'Ananya Pillai', roll: '25AD001', email: 'ananya.ad25@student.abccollege.edu' },
          { name: 'Gautam Krishna', roll: '25AD002', email: 'gautam.ad25@student.abccollege.edu' },
          { name: 'Pooja Venkatesh', roll: '25AD003', email: 'pooja.ad25@student.abccollege.edu' },
          { name: 'Vikram Joshi', roll: '25AD004', email: 'vikram.ad25@student.abccollege.edu' }
        ],
        'Year 3': [
          { name: 'Manoj Kumar', roll: '24AD001', email: 'manoj.ad24@student.abccollege.edu' },
          { name: 'Divya Sundaram', roll: '24AD002', email: 'divya.ad24@student.abccollege.edu' },
          { name: 'Naveen Balaji', roll: '24AD003', email: 'naveen.ad24@student.abccollege.edu' },
          { name: 'Shreya Varma', roll: '24AD004', email: 'shreya.ad24@student.abccollege.edu' }
        ],
        'Year 4': [
          { name: 'Abhinav Sridhar', roll: '23AD001', email: 'abhinav.ad23@student.abccollege.edu' },
          { name: 'Keerthana M', roll: '23AD002', email: 'keerthana.ad23@student.abccollege.edu' },
          { name: 'Sai Praneeth', roll: '23AD003', email: 'praneeth.ad23@student.abccollege.edu' }
        ]
      },
      CIVIL: {
        'Year 1': [
          { name: 'Arjun Das', roll: '26CE001', email: 'arjun.ce26@student.abccollege.edu' },
          { name: 'Kavitha Ramesh', roll: '26CE002', email: 'kavitha.ce26@student.abccollege.edu' },
          { name: 'Ravi Teja', roll: '26CE003', email: 'ravi.ce26@student.abccollege.edu' }
        ],
        'Year 2': [
          { name: 'Deepak Verma', roll: '25CE001', email: 'deepak.ce25@student.abccollege.edu' },
          { name: 'Lavanya Mohan', roll: '25CE002', email: 'lavanya.ce25@student.abccollege.edu' },
          { name: 'Suresh Raina', roll: '25CE003', email: 'suresh.ce25@student.abccollege.edu' }
        ],
        'Year 3': [
          { name: 'Nikhil Prabhu', roll: '24CE001', email: 'nikhil.ce24@student.abccollege.edu' },
          { name: 'Sangeetha Rao', roll: '24CE002', email: 'sangeetha.ce24@student.abccollege.edu' },
          { name: 'Tarun Reddy', roll: '24CE003', email: 'tarun.ce24@student.abccollege.edu' }
        ],
        'Year 4': [
          { name: 'Vidyasagar M', roll: '23CE001', email: 'vidya.ce23@student.abccollege.edu' },
          { name: 'Aswathy Menon', roll: '23CE002', email: 'aswathy.ce23@student.abccollege.edu' },
          { name: 'Balaram Krishna', roll: '23CE003', email: 'balaram.ce23@student.abccollege.edu' }
        ]
      },
      MECH: {
        'Year 1': [
          { name: 'Rahul Chawla', roll: '26ME001', email: 'rahul.me26@student.abccollege.edu' },
          { name: 'Monika Patel', roll: '26ME002', email: 'monika.me26@student.abccollege.edu' },
          { name: 'Akash Dixit', roll: '26ME003', email: 'akash.me26@student.abccollege.edu' }
        ],
        'Year 2': [
          { name: 'Harish Kalyan', roll: '25ME001', email: 'harish.me25@student.abccollege.edu' },
          { name: 'Pavitra Hegde', roll: '25ME002', email: 'pavitra.me25@student.abccollege.edu' },
          { name: 'Sachin Tendulkar', roll: '25ME003', email: 'sachin.me25@student.abccollege.edu' }
        ],
        'Year 3': [
          { name: 'Ajay Kulkarni', roll: '24ME001', email: 'ajay.me24@student.abccollege.edu' },
          { name: 'Bhumika Chawla', roll: '24ME002', email: 'bhumika.me24@student.abccollege.edu' },
          { name: 'Dinesh Karthik', roll: '24ME003', email: 'dinesh.me24@student.abccollege.edu' }
        ],
        'Year 4': [
          { name: 'Rajesh Gopinath', roll: '23ME001', email: 'rajesh.me23@student.abccollege.edu' },
          { name: 'Soundarya S', roll: '23ME002', email: 'soundarya.me23@student.abccollege.edu' },
          { name: 'Vishnu Vardhan', roll: '23ME003', email: 'vishnu.me23@student.abccollege.edu' }
        ]
      },
      CSE: {
        'Year 1': [
          { name: 'Preeti Deshmukh', roll: '26CS001', email: 'preeti.cs26@student.abccollege.edu' },
          { name: 'Sanjay Dutt', roll: '26CS002', email: 'sanjay.cs26@student.abccollege.edu' },
          { name: 'Anuradha Paul', roll: '26CS003', email: 'anuradha.cs26@student.abccollege.edu' }
        ],
        'Year 2': [
          { name: 'Chaitanya Varma', roll: '25CS001', email: 'chaitanya.cs25@student.abccollege.edu' },
          { name: 'Geetha Govindam', roll: '25CS002', email: 'geetha.cs25@student.abccollege.edu' },
          { name: 'Naveen Polishetty', roll: '25CS003', email: 'naveen.cs25@student.abccollege.edu' }
        ],
        'Year 3': [
          { name: 'Varun Dhawan', roll: '24CS001', email: 'varun.cs24@student.abccollege.edu' },
          { name: 'Shraddha Kapoor', roll: '24CS002', email: 'shraddha.cs24@student.abccollege.edu' },
          { name: 'Kunal Khemu', roll: '24CS003', email: 'kunal.cs24@student.abccollege.edu' }
        ],
        'Year 4': [
          { name: 'Siddharth Roy', roll: '23CS001', email: 'siddharth.cs23@student.abccollege.edu' },
          { name: 'Vidya Balan', roll: '23CS002', email: 'vidya.cs23@student.abccollege.edu' },
          { name: 'Madhavan R', roll: '23CS003', email: 'madhavan.cs23@student.abccollege.edu' }
        ]
      },
      ECE: {
        'Year 1': [
          { name: 'Kiran Bedi', roll: '26EC001', email: 'kiran.ec26@student.abccollege.edu' },
          { name: 'Aravind Swamy', roll: '26EC002', email: 'aravind.ec26@student.abccollege.edu' },
          { name: 'Meenakshi Sundaram', roll: '26EC003', email: 'meenakshi.ec26@student.abccollege.edu' }
        ],
        'Year 2': [
          { name: 'Surya Sivakumar', roll: '25EC001', email: 'surya.ec25@student.abccollege.edu' },
          { name: 'Jyothika Saravanan', roll: '25EC002', email: 'jyothika.ec25@student.abccollege.edu' },
          { name: 'Karthi Sivakumar', roll: '25EC003', email: 'karthi.ec25@student.abccollege.edu' }
        ],
        'Year 3': [
          { name: 'Vijay Sethupathi', roll: '24EC001', email: 'vijay.ec24@student.abccollege.edu' },
          { name: 'Nayanthara Kurian', roll: '24EC002', email: 'nayan.ec24@student.abccollege.edu' },
          { name: 'Samantha Ruth', roll: '24EC003', email: 'samantha.ec24@student.abccollege.edu' }
        ],
        'Year 4': [
          { name: 'Dulquer Salmaan', roll: '23EC001', email: 'dq.ec23@student.abccollege.edu' },
          { name: 'Nazriya Nazim', roll: '23EC002', email: 'nazriya.ec23@student.abccollege.edu' },
          { name: 'Fahadh Faasil', roll: '23EC003', email: 'fahadh.ec23@student.abccollege.edu' }
        ]
      }
    };

    let addedStudents = 0;

    for (const [deptCode, yearGroups] of Object.entries(studentData)) {
      const dept = deptMap[deptCode];
      if (!dept) continue;

      for (const [yearName, students] of Object.entries(yearGroups)) {
        const year = yearMap[yearName];
        if (!year) continue;

        for (const stu of students) {
          let [student, created] = await models.Student.findOrCreate({
            where: { roll_number: stu.roll, tenant_id: tenantId },
            defaults: {
              id: uuidv4(),
              tenant_id: tenantId,
              department_id: dept.id,
              academic_year_id: year.id,
              roll_number: stu.roll,
              name: stu.name,
              email: stu.email,
              phone: '98' + Math.floor(10000000 + Math.random() * 90000000),
              status: 'active'
            }
          });

          if (created) addedStudents++;
        }
      }
    }

    const totalStudents = await models.Student.count({ where: { tenant_id: tenantId } });
    console.log(`DONE! Added ${addedStudents} new students. Total students in DB: ${totalStudents}`);
    process.exit(0);
  } catch (err) {
    console.error('SEEDING ERROR:', err);
    process.exit(1);
  }
}

seedRichData();
