from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from app.models.erp import ErpOrderStatus


class ErpOrderLine(BaseModel):
    sku: str
    description: str
    quantity: float
    unit_price: float
    subtotal: float


class ErpOrderCreate(BaseModel):
    order_id: str = Field(..., description="ID único del pedido en el ERP (ej. PED-2026-9041)")
    tax_id: Optional[str] = None
    erp_customer_id: Optional[str] = None
    billing_account_id: Optional[int] = None
    billing_tax_id: Optional[str] = None
    total_amount: float
    status: ErpOrderStatus = ErpOrderStatus.CONFIRMADO
    order_date: Optional[datetime] = None
    top_products: List[str] = []
    order_lines: List[ErpOrderLine] = []


class ErpOrderResponse(BaseModel):
    id: int
    order_id: str
    erp_customer_id: Optional[str] = None
    tax_id: Optional[str] = None
    account_id: Optional[int] = None
    account_company_name: Optional[str] = None
    billing_account_id: Optional[int] = None
    billing_account_name: Optional[str] = None
    order_date: datetime
    total_amount: float
    status: ErpOrderStatus
    top_products: List[str] = []
    order_lines: List[Any] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ErpAccountSummary(BaseModel):
    account_id: int
    company_name: str
    lifecycle_stage: str
    client_type: Optional[str] = None
    billing_account_id: Optional[int] = None
    billing_account_name: Optional[str] = None
    erp_customer_id: Optional[str] = None
    tax_id: Optional[str] = None
    total_orders_count: int = 0
    total_revenue_ytd: float = 0.0
    average_ticket: float = 0.0
    first_order_date: Optional[datetime] = None
    last_order_date: Optional[datetime] = None
    top_purchased_products: List[dict] = []
    recent_orders: List[ErpOrderResponse] = []


class ErpPushResponse(BaseModel):
    success: bool
    account_id: int
    company_name: str
    erp_customer_id: str
    message: str


class SandboxSimulateOrderIn(BaseModel):
    account_id: Optional[int] = None
    tax_id: Optional[str] = None
    billing_account_id: Optional[int] = None
    order_amount: float = 4850.0
    status: ErpOrderStatus = ErpOrderStatus.CONFIRMADO
    products: List[str] = ["Tubería Inox 316L", "Válvula de Mariposa DN50"]
