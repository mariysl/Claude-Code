import csv
import io
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse

import database as db
import payments
from ai_service import stream_email_generation
from models import GenerateRequest, LeadCreate

app = FastAPI(title="LeadFlow AI")
db.init_db()

TEMPLATES = Path(__file__).parent / "templates"
TOKEN_COOKIE = "lf_token"

# Pages that don't need a subscription
PUBLIC_PATHS = {"/pricing", "/payment/success", "/webhook/stripe", "/favicon.ico"}


def get_token(request: Request) -> str | None:
    return request.cookies.get(TOKEN_COOKIE)


def is_subscribed(request: Request) -> bool:
    token = get_token(request)
    if not token:
        return False
    return db.get_subscriber_by_token(token) is not None


# ── Pages ──────────────────────────────────────────────────────────────────────

@app.get("/pricing", response_class=HTMLResponse)
async def pricing_page():
    return (TEMPLATES / "pricing.html").read_text()


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    if not is_subscribed(request):
        return RedirectResponse("/pricing")
    return (TEMPLATES / "index.html").read_text()


# ── Payments ───────────────────────────────────────────────────────────────────

@app.get("/payment/checkout")
async def checkout(request: Request):
    base = str(request.base_url).rstrip("/")
    url = payments.create_checkout_url(base)
    return RedirectResponse(url)


@app.get("/payment/success", response_class=HTMLResponse)
async def payment_success(request: Request, session_id: str):
    try:
        token = payments.activate_from_session(session_id)
    except Exception as e:
        return HTMLResponse(f"<h1>Something went wrong: {e}</h1>", status_code=400)

    response = RedirectResponse("/", status_code=303)
    response.set_cookie(
        TOKEN_COOKIE, token,
        max_age=60 * 60 * 24 * 365,  # 1 year
        httponly=True,
        samesite="lax",
    )
    return response


@app.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    ok = payments.handle_webhook(payload, sig)
    return {"ok": ok}


@app.get("/payment/portal")
async def customer_portal(request: Request):
    token = get_token(request)
    if not token:
        return RedirectResponse("/pricing")
    base = str(request.base_url).rstrip("/")
    url = payments.get_portal_url(token, base)
    return RedirectResponse(url)


@app.post("/logout")
async def logout():
    response = RedirectResponse("/pricing", status_code=303)
    response.delete_cookie(TOKEN_COOKIE)
    return response


# ── Leads ──────────────────────────────────────────────────────────────────────

@app.get("/api/leads")
def list_leads(request: Request):
    if not is_subscribed(request):
        raise HTTPException(401, "Subscription required")
    return db.get_leads()


@app.post("/api/leads", status_code=201)
def create_lead(request: Request, lead: LeadCreate):
    if not is_subscribed(request):
        raise HTTPException(401, "Subscription required")
    lead_id = db.create_lead(lead.model_dump())
    return {"id": lead_id}


@app.delete("/api/leads/{lead_id}")
def delete_lead(request: Request, lead_id: int):
    if not is_subscribed(request):
        raise HTTPException(401, "Subscription required")
    db.delete_lead(lead_id)
    return {"ok": True}


# ── Generate ───────────────────────────────────────────────────────────────────

@app.post("/api/generate/{lead_id}")
async def generate(request: Request, lead_id: int, req: GenerateRequest):
    if not is_subscribed(request):
        raise HTTPException(401, "Subscription required")
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
def get_campaign(request: Request, lead_id: int):
    if not is_subscribed(request):
        raise HTTPException(401, "Subscription required")
    campaign = db.get_campaign(lead_id)
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    return campaign


@app.get("/api/campaigns")
def list_campaigns(request: Request):
    if not is_subscribed(request):
        raise HTTPException(401, "Subscription required")
    return db.get_all_campaigns()


# ── Stats ──────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def stats(request: Request):
    if not is_subscribed(request):
        raise HTTPException(401, "Subscription required")
    return db.get_stats()


# ── Export ─────────────────────────────────────────────────────────────────────

@app.get("/api/export")
def export_csv(request: Request):
    if not is_subscribed(request):
        raise HTTPException(401, "Subscription required")
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
