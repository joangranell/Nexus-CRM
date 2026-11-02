import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class LifecycleStage(str, enum.Enum):
    LEAD = "LEAD"
    PROSPECTO = "PROSPECTO"
    POTENCIAL = "POTENCIAL"
    CLIENTE = "CLIENTE"
    INACTIVO = "INACTIVO"


class SubStatus(str, enum.Enum):
    SIN_CONTACTAR = "SIN_CONTACTAR"
    INTENTO_1 = "INTENTO_1"
    INTENTO_2 = "INTENTO_2"
    CONTACTADO_CUALIFICANDO = "CONTACTADO_CUALIFICANDO"
    DESCARTADO = "DESCARTADO"


class ClientType(str, enum.Enum):
    DISTRIBUIDOR = "DISTRIBUIDOR"
    CLIENTE_FINAL = "CLIENTE_FINAL"
    # Alias de compatibilidad hacia atrás
    CDI = "CLIENTE_FINAL"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), index=True, nullable=False)
    contact_name = Column(String(255), nullable=True)
    email = Column(String(255), index=True, nullable=True)
    email_valid = Column(Boolean, default=True, nullable=False)
    phone = Column(String(50), nullable=True)
    tax_id = Column(String(50), index=True, nullable=True)
    erp_customer_id = Column(String(100), index=True, nullable=True)
    source = Column(String(100), default="WEB", nullable=False)
    opt_in_marketing = Column(Boolean, default=True, nullable=False)

    lifecycle_stage = Column(
        Enum(LifecycleStage),
        default=LifecycleStage.LEAD,
        index=True,
        nullable=False,
    )
    sub_status = Column(
        Enum(SubStatus),
        default=SubStatus.SIN_CONTACTAR,
        index=True,
        nullable=False,
    )

    # Client Typology and Hierarchy
    client_type = Column(
        Enum(ClientType),
        nullable=True,
        index=True,
    )
    billing_account_id = Column(
        Integer,
        ForeignKey("accounts.id"),
        nullable=True,
        index=True,
    )

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    ai_summary = Column(Text, nullable=True)
    first_order_date = Column(DateTime, nullable=True)
    last_activity_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Hierarchical Relationship (Cliente Final -> Distribuidor Factura)
    billing_account = relationship(
        "Account",
        remote_side=[id],
        back_populates="final_client_accounts",
        foreign_keys=[billing_account_id],
    )
    final_client_accounts = relationship(
        "Account",
        back_populates="billing_account",
        foreign_keys=[billing_account_id],
    )

    @property
    def cdi_accounts(self):
        return self.final_client_accounts

    # Relationships
    owner = relationship("User", back_populates="accounts", foreign_keys=[owner_id])
    opportunities = relationship("Opportunity", back_populates="account", cascade="all, delete-orphan")
    interactions = relationship("Interaction", back_populates="account", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="account", cascade="all, delete-orphan")
    erp_orders = relationship(
        "ErpOrderCache",
        back_populates="account",
        foreign_keys="ErpOrderCache.account_id",
        cascade="all, delete-orphan",
    )
