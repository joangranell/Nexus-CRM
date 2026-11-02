import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ImportBatchStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    ANALYZED = "ANALYZED"
    CONSOLIDATED = "CONSOLIDATED"
    CANCELLED = "CANCELLED"


class StagingRowStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONSOLIDATED = "CONSOLIDATED"
    SKIPPED = "SKIPPED"
    ERROR = "ERROR"


class CollisionType(str, enum.Enum):
    NONE = "NONE"
    EXACT_TAX_ID = "EXACT_TAX_ID"
    EXACT_EMAIL = "EXACT_EMAIL"
    FUZZY_NAME = "FUZZY_NAME"


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # csv, xlsx, json
    total_rows = Column(Integer, default=0, nullable=False)
    processed_rows = Column(Integer, default=0, nullable=False)
    status = Column(Enum(ImportBatchStatus), default=ImportBatchStatus.UPLOADED, nullable=False, index=True)
    column_mapping = Column(JSON, default=dict, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    rows = relationship("ImportStagingRow", back_populates="batch", cascade="all, delete-orphan")
    created_by = relationship("User")


class ImportStagingRow(Base):
    __tablename__ = "import_staging_rows"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    row_index = Column(Integer, nullable=False)
    raw_data = Column(JSON, default=dict, nullable=False)
    normalized_data = Column(JSON, default=dict, nullable=False)
    collision_type = Column(Enum(CollisionType), default=CollisionType.NONE, nullable=False, index=True)
    matched_account_id = Column(Integer, nullable=True, index=True)
    suggested_stage = Column(String(50), default="LEAD", nullable=False)  # LEAD, POTENCIAL, CLIENTE
    status = Column(Enum(StagingRowStatus), default=StagingRowStatus.PENDING, nullable=False, index=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    batch = relationship("ImportBatch", back_populates="rows")
