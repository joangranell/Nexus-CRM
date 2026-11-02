import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class InteractionType(str, enum.Enum):
    CALL_NO_ANSWER = "CALL_NO_ANSWER"
    CALL_EFFECTIVE = "CALL_EFFECTIVE"
    EMAIL_1TO1 = "EMAIL_1TO1"
    MEETING_VISIT = "MEETING_VISIT"
    INBOUND_REPLY = "INBOUND_REPLY"
    NOTE = "NOTE"


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(InteractionType), nullable=False)
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    account = relationship("Account", back_populates="interactions")
    user = relationship("User", back_populates="interactions")
