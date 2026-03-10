"""
Business Process Automation App
Powered by Claude claude-opus-4-6 with tool use and streaming.
"""
import json
import os
import asyncio
from typing import AsyncGenerator

import anthropic
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from tools import TOOL_DEFINITIONS, execute_tool

app = FastAPI(title="Business Automation App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

SYSTEM_PROMPT = """You are an expert business automation assistant. Your job is to help users automate any business process quickly and professionally.

When a user describes a business task or process, you should:
1. Understand what they need
2. Use the appropriate tools to create the deliverable(s)
3. Be thorough — use multiple tools when the task requires multiple outputs
4. After using tools, provide a brief summary of what was created

Available capabilities:
- Draft professional emails (any tone, any purpose)
- Create structured business reports and documents
- Build spreadsheets with data
- Analyze data and compute statistics
- Create action plans and project plans
- Generate social media posts
- Design meeting agendas
- Perform financial calculations (ROI, break-even, margins, growth rates)
- Create process checklists and SOPs
- Extract and organize key information from text

Always be proactive: if a user asks to "plan a product launch", create an action plan AND a meeting agenda AND draft announcement emails. Go above and beyond.
"""

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


async def stream_automation(user_message: str) -> AsyncGenerator[str, None]:
    """Stream the automation process as server-sent events."""
    messages = [{"role": "user", "content": user_message}]
    tool_results_store: list[dict] = []  # track artifacts created

    def sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    yield sse("start", {"message": "Starting automation..."})

    # Agentic loop: keep going while Claude uses tools
    iteration = 0
    max_iterations = 10

    while iteration < max_iterations:
        iteration += 1
        accumulated_text = ""
        tool_calls: list[dict] = []
        current_tool_input_json = ""
        current_tool_id = ""
        current_tool_name = ""
        stop_reason = None

        # Stream from Claude
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=8000,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        ) as stream:
            for event in stream:
                # Text streaming
                if event.type == "content_block_start":
                    if hasattr(event, "content_block"):
                        if event.content_block.type == "tool_use":
                            current_tool_id = event.content_block.id
                            current_tool_name = event.content_block.name
                            current_tool_input_json = ""
                            yield sse("tool_start", {
                                "tool": current_tool_name,
                                "message": f"Using tool: {_tool_display_name(current_tool_name)}..."
                            })

                elif event.type == "content_block_delta":
                    if hasattr(event, "delta"):
                        if event.delta.type == "text_delta":
                            accumulated_text += event.delta.text
                            yield sse("text_delta", {"text": event.delta.text})
                        elif event.delta.type == "input_json_delta":
                            current_tool_input_json += event.delta.partial_json

                elif event.type == "content_block_stop":
                    if current_tool_name and current_tool_input_json:
                        try:
                            tool_input = json.loads(current_tool_input_json)
                        except json.JSONDecodeError:
                            tool_input = {}
                        tool_calls.append({
                            "id": current_tool_id,
                            "name": current_tool_name,
                            "input": tool_input
                        })
                        current_tool_name = ""
                        current_tool_input_json = ""
                        current_tool_id = ""

                elif event.type == "message_delta":
                    if hasattr(event, "delta") and hasattr(event.delta, "stop_reason"):
                        stop_reason = event.delta.stop_reason

            final_message = stream.get_final_message()
            stop_reason = final_message.stop_reason

        # Append assistant turn
        messages.append({"role": "assistant", "content": final_message.content})

        # If no tool use, we're done
        if stop_reason != "tool_use" or not tool_calls:
            break

        # Execute tools and collect results
        tool_result_blocks = []
        for tc in tool_calls:
            yield sse("tool_executing", {
                "tool": tc["name"],
                "message": f"Executing {_tool_display_name(tc['name'])}..."
            })

            text_result, structured_data = execute_tool(tc["name"], tc["input"])

            # Stream the artifact to the frontend
            if structured_data:
                tool_results_store.append(structured_data)
                yield sse("artifact", {"data": structured_data, "tool": tc["name"]})

            yield sse("tool_done", {
                "tool": tc["name"],
                "message": text_result
            })

            tool_result_blocks.append({
                "type": "tool_result",
                "tool_use_id": tc["id"],
                "content": text_result
            })

        # Feed results back to Claude
        messages.append({"role": "user", "content": tool_result_blocks})

    yield sse("complete", {
        "message": "Automation complete!",
        "artifacts_count": len(tool_results_store)
    })


def _tool_display_name(tool_name: str) -> str:
    names = {
        "draft_email": "Email Drafter",
        "create_report": "Report Generator",
        "create_spreadsheet": "Spreadsheet Builder",
        "analyze_data": "Data Analyzer",
        "create_action_plan": "Action Plan Creator",
        "generate_social_posts": "Social Media Generator",
        "create_meeting_agenda": "Meeting Agenda Builder",
        "calculate": "Calculator",
        "create_checklist": "Checklist Builder",
        "extract_key_info": "Information Extractor",
    }
    return names.get(tool_name, tool_name.replace("_", " ").title())


@app.get("/", response_class=HTMLResponse)
async def index():
    with open("static/index.html") as f:
        return f.read()


@app.post("/automate")
async def automate(request: Request):
    body = await request.json()
    user_message = body.get("message", "")
    if not user_message:
        return {"error": "No message provided"}

    return StreamingResponse(
        stream_automation(user_message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
