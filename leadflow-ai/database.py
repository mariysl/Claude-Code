import sqlite3
import json
from typing import Optional


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect("leadflow.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                access_token TEXT UNIQUE NOT NULL,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT,
                company TEXT NOT NULL,
                role TEXT NOT NULL,
                industry TEXT NOT NULL,
                pain_points TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                emails_json TEXT NOT NULL,
                strategy_notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)


def create_lead(data: dict) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO leads (first_name, last_name, email, company, role, industry, pain_points, notes)
               VALUES (:first_name, :last_name, :email, :company, :role, :industry, :pain_points, :notes)""",
            data,
        )
        return cur.lastrowid


def get_leads() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT l.*, CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as has_campaign "
            "FROM leads l LEFT JOIN campaigns c ON c.lead_id = l.id "
            "GROUP BY l.id ORDER BY l.created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_lead(lead_id: int) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        return dict(row) if row else None


def delete_lead(lead_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM leads WHERE id = ?", (lead_id,))


def save_campaign(lead_id: int, emails: list, strategy_notes: str) -> int:
    with get_conn() as conn:
        conn.execute("DELETE FROM campaigns WHERE lead_id = ?", (lead_id,))
        cur = conn.execute(
            "INSERT INTO campaigns (lead_id, emails_json, strategy_notes) VALUES (?, ?, ?)",
            (lead_id, json.dumps(emails), strategy_notes),
        )
        return cur.lastrowid


def get_campaign(lead_id: int) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT c.*, l.first_name, l.last_name, l.company, l.role "
            "FROM campaigns c JOIN leads l ON l.id = c.lead_id "
            "WHERE c.lead_id = ?",
            (lead_id,),
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["emails"] = json.loads(d["emails_json"])
        return d


def get_all_campaigns() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT c.*, l.first_name, l.last_name, l.company, l.role, l.email "
            "FROM campaigns c JOIN leads l ON l.id = c.lead_id "
            "ORDER BY c.created_at DESC"
        ).fetchall()
        results = []
        for row in rows:
            d = dict(row)
            d["emails"] = json.loads(d["emails_json"])
            results.append(d)
        return results


def create_subscriber(email: str, token: str, customer_id: str, sub_id: str):
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO subscribers (email, access_token, stripe_customer_id, stripe_subscription_id, status) "
            "VALUES (?, ?, ?, ?, 'active')",
            (email, token, customer_id, sub_id),
        )


def get_subscriber_by_token(token: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM subscribers WHERE access_token = ? AND status = 'active'", (token,)
        ).fetchone()
        return dict(row) if row else None


def get_subscriber_by_customer(customer_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM subscribers WHERE stripe_customer_id = ?", (customer_id,)
        ).fetchone()
        return dict(row) if row else None


def set_subscriber_status(customer_id: str, status: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE subscribers SET status = ? WHERE stripe_customer_id = ?",
            (status, customer_id),
        )


def get_stats() -> dict:
    with get_conn() as conn:
        leads = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
        campaigns = conn.execute("SELECT COUNT(*) FROM campaigns").fetchone()[0]
        return {"leads": leads, "campaigns": campaigns, "emails": campaigns * 3}
