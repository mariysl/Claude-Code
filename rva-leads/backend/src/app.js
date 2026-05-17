require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const leadsRouter    = require('./routes/leads');
const smsRouter      = require('./routes/sms');
const settingsRouter = require('./routes/settings');
const { startScheduler } = require('./services/scheduler');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the embeddable widget files
app.use('/widget', express.static(path.join(__dirname, '..', '..', 'widget')));

// API routes
app.use('/api/leads',    leadsRouter);
app.use('/api/sms',      smsRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 RVA Leads backend running on http://localhost:${PORT}`);
  console.log(`   Dashboard API: http://localhost:${PORT}/api/leads`);
  console.log(`   Widget files:  http://localhost:${PORT}/widget/widget.js\n`);
  startScheduler();
});

module.exports = app;
