from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # Repository root
DEFAULT_DB_PATH = (BASE_DIR / "nexus_crm.db").as_posix()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Nexus CRM"
    API_V1_PREFIX: str = "/api"
    SECRET_KEY: str = "nexus_crm_super_secret_jwt_key_2026_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"
    WEBHOOK_API_KEY: str = "nexus_webhook_secret_key_2026"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
