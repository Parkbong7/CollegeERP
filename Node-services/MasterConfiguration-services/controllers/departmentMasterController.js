exports.getDepartmentMasters = async (req, res) => {
  res.json({
    data: [
      { id: 'DEP_CSE', code: 'CSE', name: 'Computer Science & Engineering', intake: 120, status: 'Active' },
      { id: 'DEP_ECE', code: 'ECE', name: 'Electronics & Communication', intake: 120, status: 'Active' },
      { id: 'DEP_MECH', code: 'MECH', name: 'Mechanical Engineering', intake: 60, status: 'Active' }
    ]
  });
};
