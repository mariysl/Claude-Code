const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'rva-leads.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    phone            TEXT    NOT NULL,
    service_type     TEXT    NOT NULL,
    urgency          TEXT    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'new',
    notes            TEXT,
    revenue          REAL,
    google_review_sent INTEGER NOT NULL DEFAULT 0,
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS touchpoints (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    type       TEXT    NOT NULL,
    message    TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id                INTEGER PRIMARY KEY DEFAULT 1,
    business_name     TEXT    NOT NULL DEFAULT 'My Business',
    owner_phone       TEXT    NOT NULL DEFAULT '',
    google_review_url TEXT    NOT NULL DEFAULT '',
    callback_eta      TEXT    NOT NULL DEFAULT 'within 2 hours',
    review_count      INTEGER NOT NULL DEFAULT 0,
    updated_at        INTEGER NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO settings (id, updated_at) VALUES (1, ${Date.now()});
`);

module.exports = db;
