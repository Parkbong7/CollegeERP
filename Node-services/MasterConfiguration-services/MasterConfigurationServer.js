const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const masterRoutes = require('./routes/masterRoutes');

const app = express();
const PORT = process.env.MASTER_SERVICE_PORT || 5002;

app.use(cors());
app.use(express.json());

// Support both gateway route prefixes
app.use('/master', masterRoutes);
app.use('/api/master', masterRoutes);

app.get('/health', (req, res) => {
  res.json({ service: 'MasterConfiguration-services', status: 'UP', port: PORT });
});

app.listen(PORT, () => {
  console.log(`[MasterConfiguration-services] Running on port ${PORT}`);
});

module.exports = app;
