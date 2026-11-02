import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class ErpOrderStatus(str, enum.Enum):
    CONFIRMADO = "CONFIRMADO"
    FACTURADO = "FACTURADO"
    PENDIENTE_PAGO = "PENDIENTE_PAGO"


class ErpOrderCache(Base):
    __tablename__ = "erp_orders_cache"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(100), unique=True, index=True, nullable=False)
    erp_customer_id = Column(String(100), index=True, nullable=True)
    tax_id = Column(String(50), index=True, nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    billing_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    order_date = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    status = Column(Enum(ErpOrderStatus), default=ErpOrderStatus.CONFIRMADO, nullable=False, index=True)
    top_products = Column(JSON, default=list, nullable=False)
    order_lines = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    account = relationship("Account", back_populates="erp_orders", foreign_keys=[account_id])
    billing_account = relationship("Account", foreign_keys=[billing_account_id])
