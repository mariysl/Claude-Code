const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

// PUT /api/settings
router.put('/', (req, res) => {
  const { business_name, owner_phone, google_review_url, callback_eta, review_count } = req.body;

  const fields = [];
  const params = [];

  if (business_name !== undefined) { fields.push('business_name = ?'); params.push(business_name); }
  if (owner_phone    !== undefined) { fields.push('owner_phone = ?');    params.push(owner_phone);    }
  if (google_review_url !== undefined) { fields.push('google_review_url = ?'); params.push(google_review_url); }
  if (callback_eta   !== undefined) { fields.push('callback_eta = ?');   params.push(callback_eta);   }
  if (review_count   !== undefined) { fields.push('review_count = ?');   params.push(parseInt(review_count) || 0); }

  if (!fields.length) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  fields.push('updated_at = ?');
  params.push(Date.now());

  db.prepare(`UPDATE settings SET ${fields.join(', ')} WHERE id = 1`).run(...params);

  const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(updated);
});

module.exports = router;
