const express = require('express');
const db = require('../db');
const { sendSMS } = require('../services/twilio');

const router = express.Router();

// POST /api/sms/send — manually send an SMS to a lead
router.post('/send', async (req, res) => {
  const { leadId, message } = req.body;

  if (!leadId || !message || !message.trim()) {
    return res.status(400).json({ error: 'leadId and message are required' });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    await sendSMS(lead.phone, message.trim());
    db.prepare(
      'INSERT INTO touchpoints (lead_id, type, message, created_at) VALUES (?, ?, ?, ?)'
    ).run(lead.id, 'sms_sent', message.trim(), Date.now());

    res.json({ success: true, to: lead.phone });
  } catch (err) {
    res.status(500).json({ error: 'SMS failed to send', detail: err.message });
  }
});

module.exports = router;
