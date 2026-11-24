const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();
const PORT = process.env.STUDENT_SERVICE_PORT || 5003;

app.use(cors());
app.use(express.json());

// Support both gateway route prefixes
app.use('/students', studentRoutes);
app.use('/api/students', studentRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/health', (req, res) => {
  res.json({ service: 'Student-services', status: 'UP', port: PORT });
});

app.listen(PORT, () => {
  console.log(`[Student-services] Running on port ${PORT}`);
});

module.exports = app;
