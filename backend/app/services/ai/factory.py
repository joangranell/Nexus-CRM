from typing import Optional
from sqlalchemy.orm import Session
from app.models.ai import AIConfig, AIProviderType
from app.services.ai.provider_base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.copilot_azure import CopilotAzureProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.claude_provider import ClaudeProvider


def get_provider_instance(
    provider_type: str,
    api_key: Optional[str] = None,
    endpoint: Optional[str] = None,
    model_name: Optional[str] = None,
    temperature: float = 0.3,
) -> BaseAIProvider:
    """
    Factory creating concrete AI provider adapter.
    """
    p_type = (provider_type or AIProviderType.MOCK).upper()

    if p_type in ["AZURE_OPENAI", "COPILOT_AZURE", "COPILOT"]:
        return CopilotAzureProvider(
            api_key=api_key,
            endpoint=endpoint,
            model_name=model_name,
            temperature=temperature,
        )
    elif p_type == "OPENAI":
        return OpenAIProvider(
            api_key=api_key,
            endpoint=endpoint,
            model_name=model_name,
            temperature=temperature,
        )
    elif p_type in ["GEMINI", "GOOGLE_GEMINI"]:
        return GeminiProvider(
            api_key=api_key,
            endpoint=endpoint,
            model_name=model_name,
            temperature=temperature,
        )
    elif p_type in ["CLAUDE", "ANTHROPIC"]:
        return ClaudeProvider(
            api_key=api_key,
            endpoint=endpoint,
            model_name=model_name,
            temperature=temperature,
        )
    else:
        # Default is MOCK
        return MockAIProvider(
            api_key=api_key,
            endpoint=endpoint,
            model_name=model_name,
            temperature=temperature,
        )


def get_active_ai_provider(
    db: Session,
    require_enabled: bool = True,
) -> Optional[BaseAIProvider]:
    """
    Retrieves the currently configured and enabled AI provider from the database.
    If no config exists or AI is disabled (and require_enabled is True), returns None.
    """
    config = db.query(AIConfig).first()
    if not config:
        return None

    if require_enabled and not config.is_enabled:
        return None

    return get_provider_instance(
        provider_type=config.provider,
        api_key=config.api_key,
        endpoint=config.endpoint,
        model_name=config.model_name,
        temperature=config.temperature or 0.3,
    )
