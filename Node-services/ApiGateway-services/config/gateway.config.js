module.exports = {
  services: {
    master: process.env.MASTER_SERVICE_URL || 'http://localhost:5002',
    students: process.env.STUDENT_SERVICE_URL || 'http://localhost:5003',
    departments: process.env.DEPARTMENT_SERVICE_URL || 'http://localhost:5004'
  }
};
