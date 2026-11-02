import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class TaskPriority(str, enum.Enum):
    NORMAL = "NORMAL"
    HIGH_INTENT = "HIGH_INTENT"
    CHURN_ALERT = "CHURN_ALERT"


class TaskOrigin(str, enum.Enum):
    MANUAL = "MANUAL"
    STATE_MACHINE = "STATE_MACHINE"
    MARKETING_TRIGGER = "MARKETING_TRIGGER"
    ERP_ALERT = "ERP_ALERT"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    due_date = Column(DateTime, nullable=False, index=True)
    priority = Column(Enum(TaskPriority), default=TaskPriority.NORMAL, nullable=False, index=True)
    is_completed = Column(Boolean, default=False, nullable=False, index=True)
    origin = Column(Enum(TaskOrigin), default=TaskOrigin.MANUAL, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    account = relationship("Account", back_populates="tasks")
    assigned_to = relationship("User", back_populates="tasks")
