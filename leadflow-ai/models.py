from pydantic import BaseModel
from typing import Optional


class LeadCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = ""
    company: str
    role: str
    industry: str
    pain_points: Optional[str] = ""
    notes: Optional[str] = ""


class GenerateRequest(BaseModel):
    sender_name: str
    sender_company: str
    sender_role: str
    sender_value_prop: Optional[str] = ""
