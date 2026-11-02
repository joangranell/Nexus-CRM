import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN_MARKETING = "ADMIN_MARKETING"
    COMERCIAL = "COMERCIAL"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.COMERCIAL, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    accounts = relationship("Account", back_populates="owner", foreign_keys="Account.owner_id")
    opportunities = relationship("Opportunity", back_populates="owner")
    interactions = relationship("Interaction", back_populates="user")
    tasks = relationship("Task", back_populates="assigned_to")
