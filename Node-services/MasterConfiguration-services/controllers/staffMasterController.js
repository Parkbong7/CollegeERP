exports.getStaffMasters = async (req, res) => {
  res.json({
    data: [
      { id: 'STF_001', name: 'Dr. Ramesh Sharma', designation: 'Professor & HOD', department: 'CSE', email: 'ramesh@college.edu' },
      { id: 'STF_002', name: 'Dr. Sunita Rao', designation: 'Associate Professor', department: 'ECE', email: 'sunita@college.edu' }
    ]
  });
};
