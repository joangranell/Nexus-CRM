import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
    Float,
    JSON,
)
from sqlalchemy.orm import relationship
from app.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENDING = "SENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RecipientStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    OPENED = "OPENED"
    CLICKED = "CLICKED"
    HIGH_INTENT_CLICKED = "HIGH_INTENT_CLICKED"
    HARD_BOUNCE = "HARD_BOUNCE"
    SOFT_BOUNCE = "SOFT_BOUNCE"
    UNSUBSCRIBED = "UNSUBSCRIBED"
    SPAM = "SPAM"


class MailingTemplate(Base):
    __tablename__ = "mailing_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    # List of URLs considered "High Intent" (e.g. ["https://nexus.com/solicitar-tarifa"])
    high_intent_links = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    campaigns = relationship("MailingCampaign", back_populates="template")


class MailingCampaign(Base):
    __tablename__ = "mailing_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    template_id = Column(Integer, ForeignKey("mailing_templates.id"), nullable=False)
    target_stage = Column(String(50), default="ALL", nullable=False)  # LEAD, POTENCIAL, CLIENTE, ALL
    # JSON filter criteria (e.g. min_days_inactive, source, required_product, etc.)
    segment_filters = Column(JSON, default=dict, nullable=False)
    provider_used = Column(String(50), default="sandbox", nullable=False)  # sandbox, mailchimp, brevo, resend
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT, nullable=False, index=True)
    # Aggregated stats JSON cache
    stats = Column(JSON, default=dict, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sent_at = Column(DateTime, nullable=True)

    # Relationships
    template = relationship("MailingTemplate", back_populates="campaigns")
    created_by = relationship("User", foreign_keys=[created_by_id])
    recipients = relationship("MailingRecipient", back_populates="campaign", cascade="all, delete-orphan")


class MailingRecipient(Base):
    __tablename__ = "mailing_recipients"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("mailing_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    status = Column(Enum(RecipientStatus), default=RecipientStatus.QUEUED, nullable=False, index=True)
    rendered_subject = Column(String(255), nullable=True)
    rendered_html = Column(Text, nullable=True)
    last_event_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    event_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    campaign = relationship("MailingCampaign", back_populates="recipients")
    account = relationship("Account")
