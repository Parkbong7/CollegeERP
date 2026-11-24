const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const departmentRoutes = require('./routes/departmentRoutes');

const app = express();
const PORT = process.env.DEPARTMENT_SERVICE_PORT || 5004;

app.use(cors());
app.use(express.json());

// Support both gateway route prefixes
app.use('/departments', departmentRoutes);
app.use('/api/departments', departmentRoutes);

app.get('/health', (req, res) => {
  res.json({ service: 'Department-services', status: 'UP', port: PORT });
});

app.listen(PORT, () => {
  console.log(`[Department-services] Running on port ${PORT}`);
});

module.exports = app;
