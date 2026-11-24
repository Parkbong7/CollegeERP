const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 5001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/tenant', tenantRoutes);
app.use('/userApi', authRoutes); // Service-ERP standard alias

app.get('/health', (req, res) => {
  res.json({ service: 'AccessManager-services', status: 'UP', port: PORT });
});

app.listen(PORT, () => {
  console.log(`[AccessManager-services] College ERP Access Manager running on port ${PORT}`);
});

module.exports = app;
