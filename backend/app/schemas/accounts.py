from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.accounts import LifecycleStage, SubStatus, ClientType
from app.schemas.opportunities import OpportunityResponse
from app.schemas.interactions import InteractionResponse
from app.schemas.tasks import TaskResponse


class AccountBase(BaseModel):
    company_name: str = Field(..., max_length=255)
    contact_name: Optional[str] = None
    email: Optional[str] = None
    email_valid: bool = True
    phone: Optional[str] = None
    tax_id: Optional[str] = None
    erp_customer_id: Optional[str] = None
    source: str = "WEB"
    opt_in_marketing: bool = True
    lifecycle_stage: LifecycleStage = LifecycleStage.LEAD
    sub_status: SubStatus = SubStatus.SIN_CONTACTAR
    client_type: Optional[ClientType] = None
    billing_account_id: Optional[int] = None
    owner_id: Optional[int] = None
    ai_summary: Optional[str] = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    email_valid: Optional[bool] = None
    phone: Optional[str] = None
    tax_id: Optional[str] = None
    erp_customer_id: Optional[str] = None
    source: Optional[str] = None
    opt_in_marketing: Optional[bool] = None
    lifecycle_stage: Optional[LifecycleStage] = None
    sub_status: Optional[SubStatus] = None
    client_type: Optional[ClientType] = None
    billing_account_id: Optional[int] = None
    owner_id: Optional[int] = None
    ai_summary: Optional[str] = None


class AccountResponse(AccountBase):
    id: int
    first_order_date: Optional[datetime] = None
    last_activity_at: datetime
    created_at: datetime
    owner_name: Optional[str] = None
    billing_account_name: Optional[str] = None
    final_clients_count: int = 0
    cdi_count: int = 0  # alias retrocompatibilidad
    opportunities_count: int = 0
    total_pipeline_value: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class AccountDetailResponse(AccountResponse):
    opportunities: List[OpportunityResponse] = []
    interactions: List[InteractionResponse] = []
    tasks: List[TaskResponse] = []
    final_client_accounts: List[Any] = []
    cdi_accounts: List[Any] = []  # alias retrocompatibilidad


class FunnelMetrics(BaseModel):
    total_leads: int
    unassigned_leads: int
    prospectos: int
    potenciales: int
    clientes: int
    inactivos: int
    distribuidores_count: int = 0
    final_clients_count: int = 0
    cdi_count: int = 0  # alias retrocompatibilidad
    leads_sin_contactar: int
    leads_intento_1: int
    leads_intento_2: int
    conversion_rate_lead_to_prospecto: float = 0.0
    conversion_rate_prospecto_to_potencial: float = 0.0
    conversion_rate_lead_to_potencial: float = 0.0
    conversion_rate_potencial_to_cliente: float = 0.0


class QualifyAccountIn(BaseModel):
    client_type: ClientType
    billing_account_id: Optional[int] = None
    notes: Optional[str] = None


class LeadWebhookIn(BaseModel):
    company_name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tax_id: Optional[str] = None
    source: Optional[str] = "WEB_FORM"
    notes: Optional[str] = None
    client_type: Optional[ClientType] = None
    distributor_tax_id: Optional[str] = None

