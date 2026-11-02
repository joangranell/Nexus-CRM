from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class AIConfigResponse(BaseModel):
    provider: str
    is_enabled: bool
    has_api_key: bool
    masked_key: Optional[str] = None
    endpoint: Optional[str] = None
    model_name: Optional[str] = None
    temperature: float = 0.3
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AIConfigUpdate(BaseModel):
    provider: Optional[str] = None
    is_enabled: Optional[bool] = None
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = None


class AITestConnectionRequest(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    model_name: Optional[str] = None


class AITestConnectionResponse(BaseModel):
    success: bool
    message: str
    latency_ms: int
    provider: str


# -------------------------------------------------------------
# Caso a: AI Lead Enricher
# -------------------------------------------------------------
class LeadEnrichRequest(BaseModel):
    account_id: int


class LeadEnrichResponse(BaseModel):
    account_id: int
    company_name: str
    ai_summary: str
    estimated_sector: str
    estimated_size: str
    key_value_prop: str
    suggested_next_step: str


# -------------------------------------------------------------
# Caso b: Voice-to-CRM (Dictado Post-Visita)
# -------------------------------------------------------------
class VoiceToCRMRequest(BaseModel):
    transcript: str = Field(..., min_length=5)
    account_id: Optional[int] = None
    company_name: Optional[str] = None


class VoiceToCRMResponse(BaseModel):
    account_id: Optional[int] = None
    company_name: Optional[str] = None
    summary: str
    interaction_type: str
    detected_amount: Optional[float] = None
    detected_close_date: Optional[str] = None
    next_followup_days: int = 7
    promoted_to_potencial: bool = False
    promoted_to_prospecto: bool = False
    opportunity_created: bool = False
    opportunity_title: Optional[str] = None
    task_id: Optional[int] = None
    interaction_id: Optional[int] = None


# -------------------------------------------------------------
# Caso c: Detector de Intención de Correo (Inbox Sync)
# -------------------------------------------------------------
class EmailIntentRequest(BaseModel):
    email_body: str = Field(..., min_length=5)
    account_id: Optional[int] = None


class EmailIntentResponse(BaseModel):
    intent: str  # TARIFAS, REUNION, DESCARTE, CONSULTA_TECNICA, PEDIDO, GENERAL
    sentiment: str  # POSITIVO, NEUTRO, NEGATIVO
    summary: str
    suggested_action: str
    urgency: str  # ALTA, NORMAL, BAJA
    extracted_next_followup_days: int = 3


# -------------------------------------------------------------
# Caso d: Predictor de Fuga & Churn ERP
# -------------------------------------------------------------
class ChurnRiskItem(BaseModel):
    account_id: int
    company_name: str
    client_type: Optional[str] = None
    tax_id: Optional[str] = None
    total_orders_count: int
    total_revenue_ytd: float
    last_order_date: Optional[str] = None
    days_since_last_order: int
    avg_order_interval_days: float
    churn_multiplier: float
    risk_level: str  # CRITICO, ALTO, MEDIO
    suggested_reactivation_subject: str
    suggested_reactivation_message: str


class ChurnAlertTaskRequest(BaseModel):
    account_id: int
    message: str


# -------------------------------------------------------------
# Caso e: Generador de Copys de Mailing con IA
# -------------------------------------------------------------
class MailingCopyGenRequest(BaseModel):
    prompt: str = Field(..., min_length=5)
    tone: str = "profesional y persuasivo"
    target_stage: Optional[str] = None


class MailingCopyGenResponse(BaseModel):
    subject: str
    preview_text: str
    html_content: str
    suggested_segment: str
    tips: List[str] = []
