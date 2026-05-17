const express = require('express');
const db = require('../db');
const { sendSMS } = require('../services/twilio');

const router = express.Router();

const SERVICE_TYPES = ['HVAC', 'Plumbing', 'Electrical', 'Landscaping', 'Roofing'];
const URGENCY_LEVELS = ['Emergency', 'ASAP', 'Within a week', 'Just planning'];
const STATUSES = ['new', 'contacted', 'booked', 'closed'];

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return null;
}

function addTouchpoint(leadId, type, message) {
  db.prepare(
    'INSERT INTO touchpoints (lead_id, type, message, created_at) VALUES (?, ?, ?, ?)'
  ).run(leadId, type, message, Date.now());
}

// POST /api/leads — public endpoint for widget submissions
router.post('/', (req, res) => {
  const { name, phone, service_type, urgency } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Invalid phone number — enter a 10-digit US number' });
  }
  if (!SERVICE_TYPES.includes(service_type)) {
    return res.status(400).json({ error: `Service type must be one of: ${SERVICE_TYPES.join(', ')}` });
  }
  if (!URGENCY_LEVELS.includes(urgency)) {
    return res.status(400).json({ error: `Urgency must be one of: ${URGENCY_LEVELS.join(', ')}` });
  }

  const now = Date.now();
  const result = db.prepare(`
    INSERT INTO leads (name, phone, service_type, urgency, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'new', ?, ?)
  `).run(name.trim(), normalizedPhone, service_type, urgency, now, now);

  const leadId = result.lastInsertRowid;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);

  // Fire-and-forget initial SMS
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const msg = `Hi ${lead.name}, we got your ${lead.service_type} request! We'll call you ${settings.callback_eta}. – ${settings.business_name}`;
  sendSMS(lead.phone, msg)
    .then(() => {
      addTouchpoint(leadId, 'sms_sent', msg);
    })
    .catch(err => {
      console.error('[LEADS] Initial SMS failed:', err.message);
    });

  addTouchpoint(leadId, 'status_change', 'Lead created — status: new');

  res.status(201).json({ id: leadId, message: 'Got it! Check your phone for a confirmation text.' });
});

// GET /api/leads — all leads with touchpoint count
router.get('/', (req, res) => {
  const { status, service_type } = req.query;
  let query = `
    SELECT l.*, COUNT(t.id) as touchpoint_count
    FROM leads l
    LEFT JOIN touchpoints t ON t.lead_id = l.id
  `;
  const conditions = [];
  const params = [];

  if (status && STATUSES.includes(status)) {
    conditions.push('l.status = ?');
    params.push(status);
  }
  if (service_type && SERVICE_TYPES.includes(service_type)) {
    conditions.push('l.service_type = ?');
    params.push(service_type);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' GROUP BY l.id ORDER BY l.created_at DESC';

  const leads = db.prepare(query).all(...params);
  res.json(leads);
});

// GET /api/leads/stats — dashboard stats
router.get('/stats', (req, res) => {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Leads created this week
  const weekLeads = db.prepare(
    'SELECT COUNT(*) as count FROM leads WHERE created_at >= ?'
  ).get(weekAgo);

  // Leads by status
  const byStatus = db.prepare(
    "SELECT status, COUNT(*) as count FROM leads GROUP BY status"
  ).all();

  // Avg response time: time from created to first "contacted" status change
  const avgResponseMs = db.prepare(`
    SELECT AVG(t.created_at - l.created_at) as avg_ms
    FROM leads l
    JOIN touchpoints t ON t.lead_id = l.id AND t.message LIKE '%contacted%' AND t.type = 'status_change'
    WHERE l.created_at >= ?
  `).get(thirtyDaysAgo);

  const avgMinutes = avgResponseMs.avg_ms ? Math.round(avgResponseMs.avg_ms / 60000) : null;

  // Conversion rate (booked + closed / total) last 30 days
  const totalRecent = db.prepare(
    'SELECT COUNT(*) as count FROM leads WHERE created_at >= ?'
  ).get(thirtyDaysAgo);
  const convertedRecent = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE status IN ('booked', 'closed') AND created_at >= ?"
  ).get(thirtyDaysAgo);

  const conversionRate = totalRecent.count > 0
    ? Math.round((convertedRecent.count / totalRecent.count) * 100)
    : 0;

  // Revenue this week
  const weekRevenue = db.prepare(
    "SELECT COALESCE(SUM(revenue), 0) as total FROM leads WHERE status = 'closed' AND updated_at >= ?"
  ).get(weekAgo);

  // Daily lead counts for the past 7 days
  const dailyCounts = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = now - i * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const count = db.prepare(
      'SELECT COUNT(*) as count FROM leads WHERE created_at >= ? AND created_at < ?'
    ).get(dayStart, dayEnd);
    const date = new Date(dayStart);
    dailyCounts.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count: count.count,
    });
  }

  res.json({
    week_leads: weekLeads.count,
    by_status: byStatus,
    avg_response_minutes: avgMinutes,
    conversion_rate: conversionRate,
    week_revenue: weekRevenue.total,
    daily_counts: dailyCounts,
  });
});

// GET /api/leads/:id — single lead with touchpoints
router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const touchpoints = db.prepare(
    'SELECT * FROM touchpoints WHERE lead_id = ? ORDER BY created_at ASC'
  ).all(lead.id);

  res.json({ ...lead, touchpoints });
});

// PATCH /api/leads/:id — update status, notes, revenue
router.patch('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { status, notes, revenue } = req.body;
  const updates = [];
  const params = [];

  if (status !== undefined) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
    }
    updates.push('status = ?');
    params.push(status);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  if (revenue !== undefined) {
    updates.push('revenue = ?');
    params.push(parseFloat(revenue) || null);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const now = Date.now();
  updates.push('updated_at = ?');
  params.push(now);
  params.push(req.params.id);

  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  if (status && status !== lead.status) {
    addTouchpoint(lead.id, 'status_change', `Status changed: ${lead.status} → ${status}`);

    if (status === 'closed') {
      const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
      if (settings.google_review_url) {
        const msg = `Thanks for choosing ${settings.business_name}, ${lead.name}! We'd love a quick review: ${settings.google_review_url}`;
        sendSMS(lead.phone, msg)
          .then(() => {
            addTouchpoint(lead.id, 'sms_sent', msg);
            db.prepare('UPDATE leads SET google_review_sent = 1 WHERE id = ?').run(lead.id);
          })
          .catch(err => console.error('[LEADS] Review SMS failed:', err.message));
      }
    }
  }

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
