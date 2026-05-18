"""
Budget Bestie - AI Finance Budgeting App
Powered by Claude AI with Plaid bank integration.
"""
import json
import os
import asyncio
from typing import AsyncGenerator

import anthropic
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Budget Bestie")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# ── In-memory user data ──────────────────────────────────────────────────────
user_data = {
    "access_token": None,
    "item_id": None,
    "connected_bank": None,
    "income": 4000.0,
    "budgets": {
        "Bills & Rent":       {"limit": 1500.0, "color": "#f87171", "icon": "🏠"},
        "Groceries & Food":   {"limit": 400.0,  "color": "#fb923c", "icon": "🛒"},
        "Going Out & Fun":    {"limit": 200.0,  "color": "#60a5fa", "icon": "🎉"},
        "Shopping & Beauty":  {"limit": 300.0,  "color": "#f472b6", "icon": "💄"},
        "Emergency Fund":     {"limit": 500.0,  "color": "#34d399", "icon": "🚨"},
        "Savings":            {"limit": 400.0,  "color": "#fbbf24", "icon": "💰"},
        "Other":              {"limit": 200.0,  "color": "#c084fc", "icon": "📦"},
    },
    "transactions": [],
}

# ── Plaid config ─────────────────────────────────────────────────────────────
PLAID_CLIENT_ID = os.environ.get("PLAID_CLIENT_ID")
PLAID_SECRET    = os.environ.get("PLAID_SECRET")
PLAID_ENV       = os.environ.get("PLAID_ENV", "sandbox")
PLAID_BASE_URL  = {
    "sandbox":    "https://sandbox.plaid.com",
    "development":"https://development.plaid.com",
    "production": "https://production.plaid.com",
}.get(PLAID_ENV, "https://sandbox.plaid.com")

# ── Anthropic client ─────────────────────────────────────────────────────────
_anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
ai_client = anthropic.Anthropic(api_key=_anthropic_key) if _anthropic_key else None

# ── Demo data ─────────────────────────────────────────────────────────────────
def _get_demo_transactions():
    return [
        {"id":"t1",  "name":"Monthly Rent",         "amount":1200.00,"date":"2026-05-01","category":"Bills & Rent",      "merchant":"Property Mgmt"},
        {"id":"t2",  "name":"Spotify Premium",       "amount":9.99,   "date":"2026-05-02","category":"Bills & Rent",      "merchant":"Spotify"},
        {"id":"t3",  "name":"Whole Foods Market",    "amount":87.45,  "date":"2026-05-03","category":"Groceries & Food",  "merchant":"Whole Foods"},
        {"id":"t4",  "name":"Sephora",               "amount":124.00, "date":"2026-05-04","category":"Shopping & Beauty", "merchant":"Sephora"},
        {"id":"t5",  "name":"Uber Eats",             "amount":34.50,  "date":"2026-05-05","category":"Going Out & Fun",   "merchant":"Uber Eats"},
        {"id":"t6",  "name":"Electric Bill",         "amount":89.00,  "date":"2026-05-06","category":"Bills & Rent",      "merchant":"ConEd"},
        {"id":"t7",  "name":"Trader Joe's",          "amount":63.20,  "date":"2026-05-07","category":"Groceries & Food",  "merchant":"Trader Joe's"},
        {"id":"t8",  "name":"Zara",                  "amount":89.99,  "date":"2026-05-08","category":"Shopping & Beauty", "merchant":"Zara"},
        {"id":"t9",  "name":"AMC Theaters",          "amount":22.50,  "date":"2026-05-09","category":"Going Out & Fun",   "merchant":"AMC"},
        {"id":"t10", "name":"Internet & Cable",      "amount":59.99,  "date":"2026-05-10","category":"Bills & Rent",      "merchant":"Xfinity"},
        {"id":"t11", "name":"Starbucks",             "amount":6.75,   "date":"2026-05-11","category":"Groceries & Food",  "merchant":"Starbucks"},
        {"id":"t12", "name":"ASOS",                  "amount":67.50,  "date":"2026-05-12","category":"Shopping & Beauty", "merchant":"ASOS"},
        {"id":"t13", "name":"Girls Night Out",       "amount":78.00,  "date":"2026-05-13","category":"Going Out & Fun",   "merchant":"The Rooftop Bar"},
        {"id":"t14", "name":"CVS Pharmacy",          "amount":23.40,  "date":"2026-05-14","category":"Shopping & Beauty", "merchant":"CVS"},
        {"id":"t15", "name":"Netflix",               "amount":15.99,  "date":"2026-05-15","category":"Bills & Rent",      "merchant":"Netflix"},
        {"id":"t16", "name":"Target",                "amount":112.30, "date":"2026-05-16","category":"Shopping & Beauty", "merchant":"Target"},
        {"id":"t17", "name":"Instacart Groceries",   "amount":95.60,  "date":"2026-05-16","category":"Groceries & Food",  "merchant":"Instacart"},
        {"id":"t18", "name":"Concert Tickets",       "amount":85.00,  "date":"2026-05-17","category":"Going Out & Fun",   "merchant":"Ticketmaster"},
    ]

# ── Plaid category mapping ────────────────────────────────────────────────────
def _map_plaid_category(plaid_categories: list) -> str:
    cats = [c.lower() for c in (plaid_categories or [])]
    joined = " ".join(cats)
    if any(k in joined for k in ["food", "coffee", "grocery", "supermarket"]):
        return "Groceries & Food"
    if any(k in joined for k in ["restaurant", "entertainment", "nightlife", "bar"]):
        return "Going Out & Fun"
    if any(k in joined for k in ["shop", "personal care", "gym", "beauty", "apparel", "clothing"]):
        return "Shopping & Beauty"
    if any(k in joined for k in ["service", "payment", "utility", "utilities", "rent", "insurance"]):
        return "Bills & Rent"
    if any(k in joined for k in ["transfer", "saving"]):
        return "Savings"
    return "Other"

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("static/index.html") as f:
        return f.read()


@app.get("/api/status")
async def get_status():
    return {
        "bank_connected":  user_data["access_token"] is not None,
        "bank_name":       user_data["connected_bank"],
        "plaid_configured": bool(PLAID_CLIENT_ID and PLAID_SECRET),
        "ai_configured":    bool(_anthropic_key),
    }


@app.get("/api/budget")
async def get_budget():
    return {
        "income":  user_data["income"],
        "budgets": user_data["budgets"],
    }


@app.post("/api/budget")
async def update_budget(request: Request):
    body = await request.json()
    if "income" in body:
        user_data["income"] = float(body["income"])
    if "budgets" in body:
        for category, limit in body["budgets"].items():
            if category in user_data["budgets"]:
                user_data["budgets"][category]["limit"] = float(limit)
    return {"ok": True, "income": user_data["income"], "budgets": user_data["budgets"]}


@app.post("/api/plaid/create-link-token")
async def create_link_token():
    if not (PLAID_CLIENT_ID and PLAID_SECRET):
        return {"link_token": None, "demo": True}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PLAID_BASE_URL}/link/token/create",
                json={
                    "client_id": PLAID_CLIENT_ID,
                    "secret": PLAID_SECRET,
                    "client_name": "Budget Bestie",
                    "country_codes": ["US"],
                    "language": "en",
                    "user": {"client_user_id": "budget-bestie-user"},
                    "products": ["transactions"],
                },
            )
            data = resp.json()
            if "link_token" in data:
                return {"link_token": data["link_token"], "demo": False}
            return {"link_token": None, "demo": False, "error": data.get("error_message", "Unknown error")}
    except Exception as e:
        return {"link_token": None, "demo": False, "error": str(e)}


@app.post("/api/plaid/exchange-token")
async def exchange_token(request: Request):
    body = await request.json()
    public_token   = body.get("public_token")
    institution_name = body.get("institution_name", "Your Bank")
    if not (PLAID_CLIENT_ID and PLAID_SECRET):
        return {"ok": False, "error": "Plaid not configured"}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PLAID_BASE_URL}/item/public_token/exchange",
                json={
                    "client_id": PLAID_CLIENT_ID,
                    "secret": PLAID_SECRET,
                    "public_token": public_token,
                },
            )
            data = resp.json()
            if "access_token" in data:
                user_data["access_token"] = data["access_token"]
                user_data["item_id"]      = data.get("item_id")
                user_data["connected_bank"] = institution_name
                return {"ok": True, "bank_name": institution_name}
            return {"ok": False, "error": data.get("error_message", "Exchange failed")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/api/plaid/transactions")
async def get_transactions():
    if not user_data["access_token"]:
        return {"transactions": _get_demo_transactions(), "demo": True}
    try:
        from datetime import date, timedelta
        end_date   = date.today().isoformat()
        start_date = (date.today() - timedelta(days=30)).isoformat()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PLAID_BASE_URL}/transactions/get",
                json={
                    "client_id": PLAID_CLIENT_ID,
                    "secret": PLAID_SECRET,
                    "access_token": user_data["access_token"],
                    "start_date": start_date,
                    "end_date":   end_date,
                },
            )
            data = resp.json()
            if "transactions" not in data:
                return {"transactions": _get_demo_transactions(), "demo": True, "error": data.get("error_message")}
            txns = []
            for t in data["transactions"]:
                if t["amount"] <= 0:
                    continue
                txns.append({
                    "id":       t["transaction_id"],
                    "name":     t["name"],
                    "amount":   t["amount"],
                    "date":     t["date"],
                    "category": _map_plaid_category(t.get("category", [])),
                    "merchant": t.get("merchant_name") or t["name"],
                })
            user_data["transactions"] = txns
            return {"transactions": txns, "demo": False}
    except Exception as e:
        return {"transactions": _get_demo_transactions(), "demo": True, "error": str(e)}


@app.post("/api/ai/insights")
async def ai_insights(request: Request):
    body = await request.json()
    transactions = body.get("transactions", _get_demo_transactions())

    # Compute spending per category
    spending: dict[str, float] = {}
    for t in transactions:
        cat = t.get("category", "Other")
        spending[cat] = spending.get(cat, 0.0) + float(t.get("amount", 0))

    budgets    = user_data["budgets"]
    total_spent  = sum(spending.values())
    total_budget = sum(b["limit"] for b in budgets.values())

    prompt = f"""You are Budget Bestie 💕, a fun, warm, and savvy personal finance AI with girl-boss energy.

User's spending this month: {json.dumps({k: round(v, 2) for k, v in spending.items()})}
Budget limits: {json.dumps({k: v['limit'] for k, v in budgets.items()})}
Total spent: ${total_spent:.2f} / ${total_budget:.2f} budget

Provide:
## 💕 Monthly Overview
(1-2 warm honest sentences)

## ✅ Winning Categories
(categories under budget — celebrate!)

## ⚠️ Categories to Watch
(categories at/over budget — honest but kind)

## 💡 Your Action Plan
(3 specific actionable tips numbered 1-3)

## 🌟 Budget Bestie's Pep Talk
(1 short motivational closing)

Keep it conversational and fun with emojis."""

    if not ai_client:
        async def fallback():
            yield "data: " + json.dumps({"text": "💕 AI not configured — add your ANTHROPIC_API_KEY to unlock Budget Bestie's insights!"}) + "\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(fallback(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    async def stream_insights() -> AsyncGenerator[str, None]:
        with ai_client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield "data: " + json.dumps({"text": text}) + "\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_insights(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/ai/warning")
async def ai_warning(request: Request):
    body = await request.json()
    category  = body.get("category", "Other")
    amount    = float(body.get("amount", 0))
    item_name = body.get("item_name", "this purchase")

    # Compute current spending for category from demo or stored transactions
    transactions = user_data["transactions"] or _get_demo_transactions()
    current_spending = sum(
        float(t["amount"]) for t in transactions if t.get("category") == category
    )
    budget_limit = user_data["budgets"].get(category, {}).get("limit", 0)
    new_total    = current_spending + amount
    remaining    = budget_limit - current_spending
    percentage   = (new_total / budget_limit * 100) if budget_limit > 0 else 0
    warning      = new_total > budget_limit

    ai_message = ""
    if ai_client:
        prompt = f"""Budget Bestie here! 💕 Give a very short (2-3 sentences max) response about whether buying "{item_name}" for ${amount:.2f} is wise.
Category: {category}
Current spending: ${current_spending:.2f}
Budget limit: ${budget_limit:.2f}
New total if purchased: ${new_total:.2f}
Over budget: {warning}
Be {'cautionary but kind' if warning else 'encouraging and celebratory'}. Use 1-2 emojis. Keep it under 50 words."""
        try:
            msg = ai_client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            ai_message = msg.content[0].text
        except Exception:
            ai_message = "💕 Check your spending wisely!" if not warning else "⚠️ This might stretch your budget!"
    else:
        ai_message = f"{'⚠️ Heads up! This will put you over budget.' if warning else '✅ Looks good! You have room in this category.'}"

    return {
        "warning":          warning,
        "current_spending": round(current_spending, 2),
        "budget_limit":     round(budget_limit, 2),
        "remaining":        round(remaining, 2),
        "new_total":        round(new_total, 2),
        "percentage":       round(percentage, 1),
        "message":          ai_message,
    }


@app.post("/api/ai/suggest-budget")
async def suggest_budget(request: Request):
    body      = await request.json()
    income    = float(body.get("income", user_data["income"]))
    priorities = body.get("priorities", [])

    if not ai_client:
        # Simple rule-based fallback
        suggestion = {
            "Bills & Rent":      round(income * 0.35, 2),
            "Groceries & Food":  round(income * 0.12, 2),
            "Going Out & Fun":   round(income * 0.08, 2),
            "Shopping & Beauty": round(income * 0.07, 2),
            "Emergency Fund":    round(income * 0.10, 2),
            "Savings":           round(income * 0.15, 2),
            "Other":             round(income * 0.05, 2),
        }
        return {"suggestion": suggestion, "note": "Rule-based suggestion (AI not configured)"}

    priorities_str = ", ".join(priorities) if priorities else "balanced"
    prompt = f"""You are Budget Bestie 💕. Suggest a monthly budget allocation for someone earning ${income:.2f}/month.
Their priorities: {priorities_str}

Return ONLY a valid JSON object with these exact keys and dollar amounts (numbers, not strings):
"Bills & Rent", "Groceries & Food", "Going Out & Fun", "Shopping & Beauty", "Emergency Fund", "Savings", "Other"

The amounts should add up to no more than ${income:.2f}. Make it realistic and personalized to their priorities.
Return only the JSON, no other text."""

    try:
        msg = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # Extract JSON if wrapped in markdown
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggestion = json.loads(raw.strip())
        return {"suggestion": suggestion}
    except Exception as e:
        return {"error": str(e), "suggestion": None}


@app.get("/health")
async def health():
    return {"status": "ok", "app": "Budget Bestie"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
