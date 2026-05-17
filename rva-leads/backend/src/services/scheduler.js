const cron = require('node-cron');
const db = require('../db');
const { sendSMS } = require('./twilio');

function getSettings() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

function addTouchpoint(leadId, type, message) {
  db.prepare(
    'INSERT INTO touchpoints (lead_id, type, message, created_at) VALUES (?, ?, ?, ?)'
  ).run(leadId, type, message, Date.now());
}

async function runFollowUpSequence() {
  const now = Date.now();
  const twoHours  = 2  * 60 * 60 * 1000;
  const twentyFourHours = 24 * 60 * 60 * 1000;

  const settings = getSettings();
  const newLeads = db.prepare(
    "SELECT l.*, (SELECT COUNT(*) FROM touchpoints WHERE lead_id = l.id AND type = 'sms_sent') as sms_count FROM leads l WHERE l.status = 'new'"
  ).all();

  for (const lead of newLeads) {
    const age = now - lead.created_at;

    if (age >= twentyFourHours && lead.sms_count < 3) {
      const msg = `Last check-in, ${lead.name}. Reply YES if you still need ${lead.service_type} help or we'll close this request. – ${settings.business_name}`;
      await sendSMS(lead.phone, msg);
      addTouchpoint(lead.id, 'sms_sent', msg);
      console.log(`[SCHEDULER] 24h final follow-up sent to lead #${lead.id}`);
    } else if (age >= twoHours && lead.sms_count < 2) {
      const msg = `Hi ${lead.name}, just checking in — we haven't been able to reach you yet. Still need ${lead.service_type} help? – ${settings.business_name}`;
      await sendSMS(lead.phone, msg);
      addTouchpoint(lead.id, 'sms_sent', msg);
      console.log(`[SCHEDULER] 2h follow-up sent to lead #${lead.id}`);
    }
  }
}

function startScheduler() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    console.log('[SCHEDULER] Running follow-up sequence check...');
    runFollowUpSequence().catch(err =>
      console.error('[SCHEDULER ERROR]', err.message)
    );
  });
  console.log('[SCHEDULER] Follow-up scheduler started (runs every 30 min)');
}

module.exports = { startScheduler };
