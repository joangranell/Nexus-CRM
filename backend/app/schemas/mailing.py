from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.mailing import CampaignStatus, RecipientStatus


class TemplateBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    subject: str = Field(..., min_length=2, max_length=255)
    body_html: str = Field(..., min_length=5)
    high_intent_links: List[str] = Field(default_factory=list)


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    high_intent_links: Optional[List[str]] = None


class TemplateResponse(TemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SegmentFilters(BaseModel):
    target_stage: str = "ALL"  # LEAD, POTENCIAL, CLIENTE, ALL
    source: Optional[str] = None
    min_days_inactive: Optional[int] = None
    has_no_orders: Optional[bool] = None
    purchased_product: Optional[str] = None


class SegmentEstimateIn(BaseModel):
    target_stage: str = "ALL"
    segment_filters: Dict[str, Any] = Field(default_factory=dict)


class SegmentEstimateResponse(BaseModel):
    eligible_count: int
    excluded_no_consent_count: int
    excluded_invalid_email_count: int
    sample_recipients: List[Dict[str, Any]] = []


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    template_id: int
    target_stage: str = "ALL"
    segment_filters: Dict[str, Any] = Field(default_factory=dict)
    provider_used: str = "sandbox"


class CampaignStats(BaseModel):
    total_recipients: int = 0
    sent: int = 0
    delivered: int = 0
    opened: int = 0
    clicked: int = 0
    high_intent_clicked: int = 0
    hard_bounce: int = 0
    soft_bounce: int = 0
    unsubscribed: int = 0
    spam: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0
    high_intent_rate: float = 0.0


class RecipientResponse(BaseModel):
    id: int
    campaign_id: int
    account_id: int
    account_company_name: Optional[str] = None
    account_stage: Optional[str] = None
    email: str
    status: RecipientStatus
    rendered_subject: Optional[str] = None
    last_event_at: datetime
    event_details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignResponse(BaseModel):
    id: int
    name: str
    template_id: int
    template_name: Optional[str] = None
    template_subject: Optional[str] = None
    target_stage: str
    segment_filters: Dict[str, Any]
    provider_used: str
    status: CampaignStatus
    stats: Dict[str, Any] = {}
    created_at: datetime
    sent_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignDetailResponse(BaseModel):
    campaign: CampaignResponse
    template: TemplateResponse
    stats: CampaignStats
    recipients_sample: List[RecipientResponse] = []


class MailingWebhookEvent(BaseModel):
    event_type: str  # opened, clicked, hard_bounce, soft_bounce, unsubscribe, spam
    email: str
    campaign_id: Optional[int] = None
    recipient_id: Optional[int] = None
    url_clicked: Optional[str] = None
    details: Optional[str] = None


class SandboxSimulateEventIn(BaseModel):
    recipient_id: int
    event_type: str  # OPENED, CLICKED, HIGH_INTENT_CLICKED, HARD_BOUNCE, UNSUBSCRIBED
    url_clicked: Optional[str] = None
