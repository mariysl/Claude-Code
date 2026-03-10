"""
Business automation tools for Claude to use.
Each tool has a JSON schema definition and an execute function.
"""
import json
import csv
import io
import math
import re
from datetime import datetime, timedelta
from typing import Any


# ── Tool Definitions (schemas sent to Claude) ──────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "draft_email",
        "description": "Draft a professional email for any business purpose (outreach, follow-up, proposals, etc.)",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Recipient name or email"},
                "subject": {"type": "string", "description": "Email subject line"},
                "body": {"type": "string", "description": "Full email body with greeting and sign-off"},
                "tone": {"type": "string", "enum": ["formal", "friendly", "urgent", "persuasive"], "description": "Tone of the email"}
            },
            "required": ["to", "subject", "body", "tone"]
        }
    },
    {
        "name": "create_report",
        "description": "Create a structured business report or document with sections",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Report title"},
                "sections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "heading": {"type": "string"},
                            "content": {"type": "string"}
                        },
                        "required": ["heading", "content"]
                    },
                    "description": "List of sections with headings and content"
                },
                "summary": {"type": "string", "description": "Executive summary"}
            },
            "required": ["title", "sections", "summary"]
        }
    },
    {
        "name": "create_spreadsheet",
        "description": "Create a CSV spreadsheet with data rows",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "Name for the spreadsheet file (without extension)"},
                "headers": {"type": "array", "items": {"type": "string"}, "description": "Column header names"},
                "rows": {
                    "type": "array",
                    "items": {"type": "array"},
                    "description": "Data rows, each row is an array of values"
                },
                "description": {"type": "string", "description": "What this spreadsheet contains"}
            },
            "required": ["filename", "headers", "rows", "description"]
        }
    },
    {
        "name": "analyze_data",
        "description": "Analyze structured data (numbers, lists) and compute statistics or insights",
        "input_schema": {
            "type": "object",
            "properties": {
                "data_description": {"type": "string", "description": "What the data represents"},
                "numbers": {"type": "array", "items": {"type": "number"}, "description": "Numeric data to analyze"},
                "categories": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "value": {"type": "number"}
                        }
                    },
                    "description": "Category-value pairs to analyze"
                }
            },
            "required": ["data_description"]
        }
    },
    {
        "name": "create_action_plan",
        "description": "Create a structured action plan or project plan with tasks, owners, and deadlines",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_name": {"type": "string", "description": "Name of the project or initiative"},
                "objective": {"type": "string", "description": "Main goal/objective"},
                "tasks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "task": {"type": "string"},
                            "owner": {"type": "string"},
                            "deadline": {"type": "string"},
                            "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                            "status": {"type": "string", "enum": ["not started", "in progress", "complete"]}
                        },
                        "required": ["task", "priority", "status"]
                    }
                },
                "timeline": {"type": "string", "description": "Overall timeline for the project"}
            },
            "required": ["project_name", "objective", "tasks", "timeline"]
        }
    },
    {
        "name": "generate_social_posts",
        "description": "Generate social media posts for LinkedIn, Twitter/X, or other platforms",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Topic or announcement to post about"},
                "platforms": {
                    "type": "array",
                    "items": {"type": "string", "enum": ["LinkedIn", "Twitter/X", "Instagram", "Facebook"]},
                    "description": "Platforms to create posts for"
                },
                "posts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "platform": {"type": "string"},
                            "content": {"type": "string"},
                            "hashtags": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["platform", "content"]
                    }
                }
            },
            "required": ["topic", "platforms", "posts"]
        }
    },
    {
        "name": "create_meeting_agenda",
        "description": "Create a structured meeting agenda with time slots",
        "input_schema": {
            "type": "object",
            "properties": {
                "meeting_title": {"type": "string"},
                "date_time": {"type": "string", "description": "Meeting date and time"},
                "duration_minutes": {"type": "integer"},
                "attendees": {"type": "array", "items": {"type": "string"}},
                "agenda_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "item": {"type": "string"},
                            "duration_minutes": {"type": "integer"},
                            "owner": {"type": "string"},
                            "notes": {"type": "string"}
                        },
                        "required": ["item", "duration_minutes"]
                    }
                },
                "objectives": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["meeting_title", "duration_minutes", "agenda_items", "objectives"]
        }
    },
    {
        "name": "calculate",
        "description": "Perform financial calculations, ROI, break-even analysis, projections, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "calculation_type": {"type": "string", "description": "Type of calculation (e.g., ROI, break-even, growth rate, margin)"},
                "inputs": {
                    "type": "object",
                    "description": "Key-value pairs of input values",
                    "additionalProperties": {"type": "number"}
                },
                "formula": {"type": "string", "description": "Description of the formula being applied"}
            },
            "required": ["calculation_type", "inputs", "formula"]
        }
    },
    {
        "name": "create_checklist",
        "description": "Create a process checklist or standard operating procedure (SOP)",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "purpose": {"type": "string"},
                "steps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "step_number": {"type": "integer"},
                            "action": {"type": "string"},
                            "details": {"type": "string"},
                            "responsible": {"type": "string"}
                        },
                        "required": ["step_number", "action"]
                    }
                },
                "notes": {"type": "string"}
            },
            "required": ["title", "purpose", "steps"]
        }
    },
    {
        "name": "extract_key_info",
        "description": "Extract and organize key information from text provided by the user",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_text": {"type": "string", "description": "The text to extract information from"},
                "extraction_type": {"type": "string", "description": "What to extract (e.g., contacts, dates, action items, requirements)"},
                "extracted_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "category": {"type": "string"},
                            "value": {"type": "string"},
                            "context": {"type": "string"}
                        },
                        "required": ["category", "value"]
                    }
                }
            },
            "required": ["source_text", "extraction_type", "extracted_items"]
        }
    }
]


# ── Tool Execution Functions ────────────────────────────────────────────────

def execute_tool(name: str, inputs: dict) -> tuple[str, dict]:
    """
    Execute a tool and return (text_result, structured_data).
    structured_data is used to render rich UI components.
    """
    handlers = {
        "draft_email": _handle_draft_email,
        "create_report": _handle_create_report,
        "create_spreadsheet": _handle_create_spreadsheet,
        "analyze_data": _handle_analyze_data,
        "create_action_plan": _handle_create_action_plan,
        "generate_social_posts": _handle_generate_social_posts,
        "create_meeting_agenda": _handle_create_meeting_agenda,
        "calculate": _handle_calculate,
        "create_checklist": _handle_create_checklist,
        "extract_key_info": _handle_extract_key_info,
    }
    handler = handlers.get(name)
    if not handler:
        return f"Unknown tool: {name}", {}
    return handler(inputs)


def _handle_draft_email(inp: dict) -> tuple[str, dict]:
    data = {
        "type": "email",
        "to": inp["to"],
        "subject": inp["subject"],
        "body": inp["body"],
        "tone": inp["tone"]
    }
    text = f"Email drafted to {inp['to']} with subject: {inp['subject']}"
    return text, data


def _handle_create_report(inp: dict) -> tuple[str, dict]:
    data = {
        "type": "report",
        "title": inp["title"],
        "summary": inp["summary"],
        "sections": inp["sections"]
    }
    section_count = len(inp["sections"])
    text = f"Report '{inp['title']}' created with {section_count} section(s)."
    return text, data


def _handle_create_spreadsheet(inp: dict) -> tuple[str, dict]:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(inp["headers"])
    for row in inp["rows"]:
        writer.writerow(row)
    csv_content = output.getvalue()

    data = {
        "type": "spreadsheet",
        "filename": inp["filename"],
        "description": inp["description"],
        "headers": inp["headers"],
        "rows": inp["rows"],
        "csv_content": csv_content
    }
    text = f"Spreadsheet '{inp['filename']}' created with {len(inp['rows'])} rows."
    return text, data


def _handle_analyze_data(inp: dict) -> tuple[str, dict]:
    results = {"description": inp["data_description"], "statistics": {}, "insights": []}

    if numbers := inp.get("numbers"):
        n = len(numbers)
        total = sum(numbers)
        mean = total / n if n else 0
        sorted_nums = sorted(numbers)
        median = sorted_nums[n // 2] if n % 2 else (sorted_nums[n//2 - 1] + sorted_nums[n//2]) / 2
        variance = sum((x - mean) ** 2 for x in numbers) / n if n else 0
        std_dev = math.sqrt(variance)

        results["statistics"] = {
            "count": n,
            "sum": round(total, 2),
            "mean": round(mean, 2),
            "median": round(median, 2),
            "min": min(numbers),
            "max": max(numbers),
            "std_dev": round(std_dev, 2),
            "range": max(numbers) - min(numbers)
        }
        results["insights"].append(f"Average value: {mean:.2f}")
        results["insights"].append(f"Range from {min(numbers)} to {max(numbers)}")

    if categories := inp.get("categories"):
        total = sum(c["value"] for c in categories)
        sorted_cats = sorted(categories, key=lambda x: x["value"], reverse=True)
        results["categories"] = [
            {**c, "percentage": round(c["value"] / total * 100, 1) if total else 0}
            for c in sorted_cats
        ]
        if sorted_cats:
            results["insights"].append(f"Top category: {sorted_cats[0]['name']} ({sorted_cats[0]['value']})")

    data = {"type": "analysis", **results}
    text = f"Data analysis complete for: {inp['data_description']}"
    return text, data


def _handle_create_action_plan(inp: dict) -> tuple[str, dict]:
    data = {
        "type": "action_plan",
        "project_name": inp["project_name"],
        "objective": inp["objective"],
        "timeline": inp["timeline"],
        "tasks": inp["tasks"]
    }
    high = sum(1 for t in inp["tasks"] if t.get("priority") == "high")
    text = f"Action plan for '{inp['project_name']}' with {len(inp['tasks'])} tasks ({high} high priority)."
    return text, data


def _handle_generate_social_posts(inp: dict) -> tuple[str, dict]:
    data = {
        "type": "social_posts",
        "topic": inp["topic"],
        "posts": inp["posts"]
    }
    platforms = [p["platform"] for p in inp["posts"]]
    text = f"Social posts generated for: {', '.join(platforms)}"
    return text, data


def _handle_create_meeting_agenda(inp: dict) -> tuple[str, dict]:
    total_time = sum(item["duration_minutes"] for item in inp["agenda_items"])
    data = {
        "type": "meeting_agenda",
        "meeting_title": inp["meeting_title"],
        "date_time": inp.get("date_time", "TBD"),
        "duration_minutes": inp["duration_minutes"],
        "attendees": inp.get("attendees", []),
        "objectives": inp["objectives"],
        "agenda_items": inp["agenda_items"],
        "total_allocated": total_time
    }
    text = f"Agenda for '{inp['meeting_title']}' with {len(inp['agenda_items'])} items ({total_time} min allocated)."
    return text, data


def _handle_calculate(inp: dict) -> tuple[str, dict]:
    inputs = inp.get("inputs", {})
    calc_type = inp["calculation_type"].lower()
    result = None
    breakdown = []

    if "roi" in calc_type:
        gain = inputs.get("gain", 0) or inputs.get("revenue", 0) or inputs.get("return", 0)
        cost = inputs.get("cost", 0) or inputs.get("investment", 0)
        if cost:
            result = ((gain - cost) / cost) * 100
            breakdown = [
                f"Gain/Return: ${gain:,.2f}",
                f"Cost/Investment: ${cost:,.2f}",
                f"ROI: {result:.1f}%"
            ]
    elif "break" in calc_type:
        fixed = inputs.get("fixed_costs", 0)
        price = inputs.get("price_per_unit", 0) or inputs.get("selling_price", 0)
        variable = inputs.get("variable_cost_per_unit", 0) or inputs.get("variable_cost", 0)
        if price and (price - variable):
            result = fixed / (price - variable)
            breakdown = [
                f"Fixed Costs: ${fixed:,.2f}",
                f"Price/Unit: ${price:,.2f}",
                f"Variable Cost/Unit: ${variable:,.2f}",
                f"Contribution Margin: ${price - variable:,.2f}",
                f"Break-even Units: {result:,.0f}"
            ]
    elif "margin" in calc_type or "profit" in calc_type:
        revenue = inputs.get("revenue", 0)
        cost = inputs.get("cost", 0) or inputs.get("cogs", 0)
        if revenue:
            profit = revenue - cost
            result = (profit / revenue) * 100
            breakdown = [
                f"Revenue: ${revenue:,.2f}",
                f"Cost: ${cost:,.2f}",
                f"Profit: ${profit:,.2f}",
                f"Margin: {result:.1f}%"
            ]
    elif "growth" in calc_type or "cagr" in calc_type:
        start = inputs.get("start_value", 0) or inputs.get("initial", 0)
        end = inputs.get("end_value", 0) or inputs.get("final", 0)
        years = inputs.get("years", 1) or inputs.get("periods", 1)
        if start and years:
            result = ((end / start) ** (1 / years) - 1) * 100
            breakdown = [
                f"Start Value: {start:,.2f}",
                f"End Value: {end:,.2f}",
                f"Periods: {years}",
                f"CAGR: {result:.2f}%"
            ]

    # Fallback: just sum inputs
    if result is None:
        result = sum(inputs.values())
        breakdown = [f"{k}: {v}" for k, v in inputs.items()]
        breakdown.append(f"Total: {result:,.2f}")

    data = {
        "type": "calculation",
        "calculation_type": inp["calculation_type"],
        "formula": inp["formula"],
        "inputs": inputs,
        "result": round(result, 2) if result is not None else 0,
        "breakdown": breakdown
    }
    text = f"Calculation complete: {inp['calculation_type']} = {result:.2f}" if result is not None else "Calculation complete"
    return text, data


def _handle_create_checklist(inp: dict) -> tuple[str, dict]:
    data = {
        "type": "checklist",
        "title": inp["title"],
        "purpose": inp["purpose"],
        "steps": inp["steps"],
        "notes": inp.get("notes", "")
    }
    text = f"Checklist '{inp['title']}' created with {len(inp['steps'])} steps."
    return text, data


def _handle_extract_key_info(inp: dict) -> tuple[str, dict]:
    data = {
        "type": "extracted_info",
        "extraction_type": inp["extraction_type"],
        "items": inp["extracted_items"]
    }
    text = f"Extracted {len(inp['extracted_items'])} {inp['extraction_type']} items."
    return text, data
