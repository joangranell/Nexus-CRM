import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class OpportunityStatus(str, enum.Enum):
    ABIERTA = "ABIERTA"
    GANADA = "GANADA"
    PERDIDA = "PERDIDA"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    detected_need = Column(Text, nullable=True)
    estimated_amount = Column(Float, default=0.0, nullable=False)
    status = Column(Enum(OpportunityStatus), default=OpportunityStatus.ABIERTA, nullable=False, index=True)
    expected_close_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    account = relationship("Account", back_populates="opportunities")
    owner = relationship("User", back_populates="opportunities")
