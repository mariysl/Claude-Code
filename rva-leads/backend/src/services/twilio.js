// ─── Twilio SMS Service ───────────────────────────────────────────────────
// To enable real SMS, sign up at twilio.com, buy a phone number, then set
// these three env vars in your .env file (copy from .env.example).
//
// Until credentials are set, SMS calls are logged to the console only.

require('dotenv').config();

const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER  = process.env.TWILIO_FROM_NUMBER;

const credentialsConfigured =
  ACCOUNT_SID && ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' &&
  AUTH_TOKEN  && AUTH_TOKEN  !== 'your_auth_token_here' &&
  FROM_NUMBER;

let twilioClient = null;
if (credentialsConfigured) {
  const twilio = require('twilio');
  twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN);
}

async function sendSMS(to, body) {
  if (!credentialsConfigured) {
    console.log(`[SMS MOCK] To: ${to} | Message: ${body}`);
    return { sid: 'MOCK_SID', status: 'mock' };
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: FROM_NUMBER,
      to,
    });
    console.log(`[SMS SENT] To: ${to} | SID: ${message.sid}`);
    return message;
  } catch (err) {
    console.error(`[SMS ERROR] To: ${to} | ${err.message}`);
    return null;
  }
}

module.exports = { sendSMS };
