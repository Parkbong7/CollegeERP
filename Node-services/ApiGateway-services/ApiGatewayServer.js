const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.GATEWAY_PORT || 5000;

app.use(cors());
app.use(express.json());

const SERVICES = {
  access: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  master: process.env.MASTER_SERVICE_URL || 'http://localhost:5002',
  students: process.env.STUDENT_SERVICE_URL || 'http://localhost:5003',
  departments: process.env.DEPARTMENT_SERVICE_URL || 'http://localhost:5004',
  middleware: process.env.MIDDLEWARE_URL || 'http://localhost:4500'
};

app.get('/health', (req, res) => {
  res.json({
    service: 'College ERP - Unified API Gateway',
    status: 'UP',
    port: PORT,
    routes: {
      '/auth/*': SERVICES.access,
      '/tenant/*': SERVICES.access,
      '/userApi/*': SERVICES.access,
      '/master/*': SERVICES.master,
      '/students/*': SERVICES.students,
      '/departments/*': SERVICES.departments,
      '/middleware/*': SERVICES.middleware
    }
  });
});

// Proxy forwarder
async function proxyRequest(targetBaseUrl, req, res) {
  try {
    const targetUrl = `${targetBaseUrl}${req.originalUrl}`;
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        authorization: req.headers.authorization,
        'content-type': req.headers['content-type'] || 'application/json'
      },
      data: req.method !== 'GET' ? req.body : undefined,
      validateStatus: () => true
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error(`[API Gateway Proxy Error] ${req.method} ${req.originalUrl}:`, err.message);
    res.status(502).json({
      success: false,
      error: {
        message: `API Gateway error forwarding request to service: ${err.message}`,
        status: 502
      }
    });
  }
}

// Route mapping
app.use(['/auth', '/tenant', '/userApi', '/api/auth', '/api/tenant'], (req, res) => proxyRequest(SERVICES.access, req, res));
app.use(['/master', '/api/master'], (req, res) => proxyRequest(SERVICES.master, req, res));
app.use(['/students', '/api/students', '/attendance', '/api/attendance'], (req, res) => proxyRequest(SERVICES.students, req, res));
app.use(['/departments', '/api/departments'], (req, res) => proxyRequest(SERVICES.departments, req, res));
app.use(['/middleware', '/api/middleware'], (req, res) => proxyRequest(SERVICES.middleware, req, res));

app.listen(PORT, () => {
  console.log(`[API Gateway] College ERP Unified Gateway running on port ${PORT}`);
  console.log(`[API Gateway] Registered services:`, SERVICES);
});

module.exports = app;
