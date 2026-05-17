import csv
import io
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

import database as db
from ai_service import stream_email_generation
from models import GenerateRequest, LeadCreate

app = FastAPI(title="LeadFlow AI")
db.init_db()

TEMPLATES = Path(__file__).parent / "templates"


@app.get("/", response_class=HTMLResponse)
async def root():
    return (TEMPLATES / "index.html").read_text()


# ── Leads ──────────────────────────────────────────────────────────────────────

@app.get("/api/leads")
def list_leads():
    return db.get_leads()


@app.post("/api/leads", status_code=201)
def create_lead(lead: LeadCreate):
    lead_id = db.create_lead(lead.model_dump())
    return {"id": lead_id}


@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: int):
    db.delete_lead(lead_id)
    return {"ok": True}


# ── Generate ───────────────────────────────────────────────────────────────────

@app.post("/api/generate/{lead_id}")
async def generate(lead_id: int, req: GenerateRequest):
    lead = db.get_lead(lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")

    async def event_stream():
        async for event_json in stream_email_generation(lead, req.model_dump()):
            event = json.loads(event_json)
            if event["type"] == "done":
                data = event["data"]
                db.save_campaign(
                    lead_id,
                    data.get("emails", []),
                    data.get("strategy_notes", ""),
                )
            yield f"data: {event_json}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Campaigns ──────────────────────────────────────────────────────────────────

@app.get("/api/campaigns/{lead_id}")
def get_campaign(lead_id: int):
    campaign = db.get_campaign(lead_id)
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    return campaign


@app.get("/api/campaigns")
def list_campaigns():
    return db.get_all_campaigns()


# ── Stats ──────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def stats():
    return db.get_stats()


# ── Export ─────────────────────────────────────────────────────────────────────

@app.get("/api/export")
def export_csv():
    campaigns = db.get_all_campaigns()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Lead Name", "Company", "Role", "Email",
        "Email 1 Subject", "Email 1 Body",
        "Email 2 Subject", "Email 2 Body",
        "Email 3 Subject", "Email 3 Body",
        "Strategy Notes",
    ])

    for c in campaigns:
        emails = c["emails"]
        row = [
            f"{c['first_name']} {c['last_name']}",
            c["company"], c["role"], c.get("email", ""),
        ]
        for i in range(3):
            if i < len(emails):
                row += [emails[i]["subject"], emails[i]["body"]]
            else:
                row += ["", ""]
        row.append(c.get("strategy_notes", ""))
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leadflow_campaigns.csv"},
    )
