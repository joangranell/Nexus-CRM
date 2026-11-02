from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.interactions import InteractionType


class InteractionCreate(BaseModel):
    type: InteractionType
    summary: str = Field(..., min_length=3)
    # Optional fields for State Machine actions (next follow-up task and opportunity)
    next_followup_date: Optional[datetime] = None
    followup_task_title: Optional[str] = None
    create_opportunity: bool = False
    opportunity_title: Optional[str] = None
    opportunity_amount: Optional[float] = 0.0
    opportunity_need: Optional[str] = None
    opportunity_close_date: Optional[datetime] = None


class InteractionResponse(BaseModel):
    id: int
    account_id: int
    user_id: int
    user_name: Optional[str] = None
    type: InteractionType
    summary: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
