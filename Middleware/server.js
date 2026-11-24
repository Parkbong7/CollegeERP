const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { loggerMiddleware, authMiddleware, errorHandler } = require('./src');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4500;

app.use(cors());
app.use(express.json());
app.use(loggerMiddleware);

app.get(['/', '/health', '/middleware/health'], (req, res) => {
  res.json({ service: 'Middleware Hub', status: 'UP', port: PORT });
});

app.get(['/verify', '/middleware/verify'], authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Token verified by Middleware', user: req.user });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Middleware] Running on port ${PORT}`);
});
