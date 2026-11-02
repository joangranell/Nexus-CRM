from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.opportunities import OpportunityStatus


class OpportunityBase(BaseModel):
    title: str = Field(..., max_length=255)
    detected_need: Optional[str] = None
    estimated_amount: float = Field(default=0.0, ge=0.0)
    status: OpportunityStatus = OpportunityStatus.ABIERTA
    expected_close_date: Optional[datetime] = None


class OpportunityCreate(OpportunityBase):
    account_id: int


class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    detected_need: Optional[str] = None
    estimated_amount: Optional[float] = None
    status: Optional[OpportunityStatus] = None
    expected_close_date: Optional[datetime] = None


class OpportunityResponse(OpportunityBase):
    id: int
    account_id: int
    owner_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
