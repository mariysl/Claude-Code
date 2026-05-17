import anthropic
import json
import re
from typing import AsyncGenerator

_SYSTEM_PROMPT = """You are an elite B2B sales strategist and copywriter with 15 years of experience. You write cold email campaigns that consistently achieve 15-25% reply rates.

Your emails:
- Are conversational and feel personally written, never robotic or template-like
- Lead with the prospect's specific pain, not the sender's pitch
- Are concise — every sentence earns its place
- Have one clear, low-friction CTA per email
- Avoid clichés: no "hope this finds you well", "quick question", "touching base", "circle back"
- Use industry-specific language that shows genuine understanding
- Reference real, plausible specifics about their situation

You always output valid JSON and nothing else."""


def _build_prompt(lead: dict, req: dict) -> str:
    return f"""Generate a 3-email cold outreach sequence.

PROSPECT:
Name: {lead['first_name']} {lead['last_name']}
Company: {lead['company']}
Role: {lead['role']}
Industry: {lead['industry']}
Pain points: {lead.get('pain_points') or 'Not specified'}
Additional context: {lead.get('notes') or 'None'}

SENDER:
Name: {req['sender_name']}
Company: {req['sender_company']}
Role: {req['sender_role']}
Value proposition: {req.get('sender_value_prop') or 'Not specified'}

EMAIL SEQUENCE SPECS:

Email 1 — Day 1 (Cold Outreach):
- Open with their specific pain point, not with "I" or sender info
- Show you understand their world with one specific insight
- Brief mention of what sender does (1 sentence max)
- CTA: low-friction question like "Is this a challenge you're dealing with?" or "Worth a 5-min chat?"
- Max 100 words

Email 2 — Day 4 (Value Add Follow-Up):
- Don't just say "following up" — add something new
- Include one relevant data point, industry insight, or brief case study result
- Different angle than email 1
- CTA: slightly more direct but still easy to say yes to
- Max 130 words

Email 3 — Day 9 (Break-Up):
- Short, honest, creates closure
- Often gets replies because it's genuine, not pushy
- Can include a resource or final piece of value
- Max 70 words

Return ONLY this JSON, no other text or markdown:
{{
  "emails": [
    {{
      "subject": "subject line for email 1",
      "body": "full email body with proper \\n line breaks",
      "send_day": 1
    }},
    {{
      "subject": "subject line for email 2",
      "body": "full email body",
      "send_day": 4
    }},
    {{
      "subject": "subject line for email 3",
      "body": "full email body",
      "send_day": 9
    }}
  ],
  "strategy_notes": "2-3 sentences on the personalization strategy used"
}}"""


def _extract_json(text: str) -> str:
    match = re.search(r'\{[\s\S]*\}', text)
    return match.group(0) if match else text


async def stream_email_generation(
    lead: dict,
    req: dict,
) -> AsyncGenerator[str, None]:
    client = anthropic.Anthropic()

    full_text = ""

    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=[{
            "type": "text",
            "text": _SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": _build_prompt(lead, req)}],
    ) as stream:
        for text in stream.text_stream:
            full_text += text
            yield json.dumps({"type": "chunk", "text": text})

    try:
        raw = _extract_json(full_text)
        parsed = json.loads(raw)
        yield json.dumps({"type": "done", "data": parsed})
    except Exception as e:
        yield json.dumps({"type": "error", "message": f"Parse error: {e}", "raw": full_text})
