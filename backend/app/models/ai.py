from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from app.database import Base


class AIProviderType:
    MOCK = "MOCK"
    AZURE_OPENAI = "AZURE_OPENAI"
    OPENAI = "OPENAI"
    GEMINI = "GEMINI"
    CLAUDE = "CLAUDE"


class AIConfig(Base):
    """
    Configuration for Bring Your Own Key (BYOK) Multi-Provider AI module.
    100% optional, disabled by default.
    """
    __tablename__ = "ai_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), default=AIProviderType.MOCK, nullable=False)
    is_enabled = Column(Boolean, default=False, nullable=False)
    api_key = Column(String(255), nullable=True)
    endpoint = Column(String(255), nullable=True)  # Required for Azure OpenAI
    model_name = Column(String(100), nullable=True)
    temperature = Column(Float, default=0.3, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
