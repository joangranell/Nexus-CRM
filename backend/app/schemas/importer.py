from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.staging import ImportBatchStatus, StagingRowStatus, CollisionType


class ColumnMappingIn(BaseModel):
    mapping: Dict[str, str] = Field(
        ...,
        description="Mapeo de columna origen a campo interno: company_name, contact_name, email, phone, tax_id, notes, source, lifecycle_stage, client_type, distributor_ref, estimated_amount, expected_close_date",
    )


class DuplicateResolutionStrategy(str):
    SKIP = "SKIP"            # Omitir duplicados
    UPDATE_EMPTY = "UPDATE_EMPTY"  # Rellenar solo campos vacíos
    OVERWRITE = "OVERWRITE"  # Sobrescribir datos existentes


class ConsolidateBatchIn(BaseModel):
    resolution_strategy: str = Field(
        default="SKIP",
        description="Estrategia para duplicados: SKIP, UPDATE_EMPTY, OVERWRITE",
    )
    assign_to_user_id: Optional[int] = None


class StagingRowResponse(BaseModel):
    id: int
    batch_id: int
    row_index: int
    raw_data: Dict[str, Any]
    normalized_data: Dict[str, Any]
    collision_type: CollisionType
    matched_account_id: Optional[int] = None
    matched_account_name: Optional[str] = None
    suggested_stage: str
    status: StagingRowStatus
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class BatchResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    total_rows: int
    processed_rows: int
    status: ImportBatchStatus
    column_mapping: Dict[str, str]
    created_at: datetime
    detected_columns: List[str] = []

    class Config:
        from_attributes = True


class BatchDetailResponse(BaseModel):
    batch: BatchResponse
    rows_sample: List[StagingRowResponse]
    stats: Dict[str, int]


class ConsolidationResult(BaseModel):
    batch_id: int
    total_processed: int
    created_leads: int
    created_prospectos: int = 0
    created_potenciales: int
    created_clientes: int
    updated_existing: int
    skipped_duplicates: int
    errors: int
    message: str
