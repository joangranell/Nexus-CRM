from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.users import User, UserRole
from app.models.staging import ImportBatch, ImportStagingRow, ImportBatchStatus
from app.models.accounts import Account
from app.schemas.importer import (
    BatchResponse,
    BatchDetailResponse,
    StagingRowResponse,
    ColumnMappingIn,
    ConsolidateBatchIn,
    ConsolidationResult,
)
from app.services.auth import get_current_user, require_role
from app.services.importer import (
    create_import_batch,
    analyze_and_map_batch,
    consolidate_batch,
)

router = APIRouter(prefix="/imports", tags=["Importación Masiva (4 Etapas)"])


@router.post("/upload", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def upload_import_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_MARKETING])),
):
    """
    Stage 1: Receives CSV, XLSX or JSON file and loads rows into staging table
    without touching the accounts table.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo subido está vacío")

    try:
        batch = create_import_batch(db, file.filename, content, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando el archivo: {str(e)}")

    # Extract detected raw columns
    first_row = db.query(ImportStagingRow).filter(ImportStagingRow.batch_id == batch.id).first()
    detected_cols = list(first_row.raw_data.keys()) if first_row and first_row.raw_data else []

    res = BatchResponse.model_validate(batch)
    res.detected_columns = detected_cols
    return res


@router.get("/batches", response_model=List[BatchResponse])
def list_import_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_MARKETING])),
):
    """Lists all import batches."""
    batches = db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).all()
    results = []
    for b in batches:
        first_row = db.query(ImportStagingRow).filter(ImportStagingRow.batch_id == b.id).first()
        detected_cols = list(first_row.raw_data.keys()) if first_row and first_row.raw_data else []
        br = BatchResponse.model_validate(b)
        br.detected_columns = detected_cols
        results.append(br)
    return results


@router.get("/batches/{batch_id}", response_model=BatchDetailResponse)
def get_batch_detail(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_MARKETING])),
):
    """
    Returns batch details, detected columns, collision stats, and sample rows for the UI wizard.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    rows = (
        db.query(ImportStagingRow)
        .filter(ImportStagingRow.batch_id == batch_id)
        .order_by(ImportStagingRow.row_index.asc())
        .limit(100)
        .all()
    )

    first_row = rows[0] if rows else None
    detected_cols = list(first_row.raw_data.keys()) if first_row and first_row.raw_data else []

    # Calculate stats
    all_rows = db.query(ImportStagingRow).filter(ImportStagingRow.batch_id == batch_id).all()
    stats = {
        "total": len(all_rows),
        "collisions_exact_tax": sum(1 for r in all_rows if r.collision_type.value == "EXACT_TAX_ID"),
        "collisions_exact_email": sum(1 for r in all_rows if r.collision_type.value == "EXACT_EMAIL"),
        "collisions_fuzzy_name": sum(1 for r in all_rows if r.collision_type.value == "FUZZY_NAME"),
        "clean_rows": sum(1 for r in all_rows if r.collision_type.value == "NONE"),
        "suggested_leads": sum(1 for r in all_rows if r.suggested_stage == "LEAD"),
        "suggested_prospectos": sum(1 for r in all_rows if r.suggested_stage == "PROSPECTO"),
        "suggested_potenciales": sum(1 for r in all_rows if r.suggested_stage == "POTENCIAL"),
        "suggested_clientes": sum(1 for r in all_rows if r.suggested_stage == "CLIENTE"),
        "distributor_rows": sum(1 for r in all_rows if (r.normalized_data or {}).get("client_type") == "DISTRIBUIDOR"),
        "final_client_rows": sum(1 for r in all_rows if (r.normalized_data or {}).get("client_type") in ("CLIENTE_FINAL", "CDI")),
        "cdi_rows": sum(1 for r in all_rows if (r.normalized_data or {}).get("client_type") in ("CLIENTE_FINAL", "CDI")),
        "rows_with_errors": sum(1 for r in all_rows if r.error_message),
    }

    # Match names for collided accounts
    matched_ids = [r.matched_account_id for r in rows if r.matched_account_id]
    acc_map = {}
    if matched_ids:
        accs = db.query(Account).filter(Account.id.in_(matched_ids)).all()
        acc_map = {a.id: a.company_name for a in accs}

    row_responses = []
    for r in rows:
        rr = StagingRowResponse.model_validate(r)
        if r.matched_account_id:
            rr.matched_account_name = acc_map.get(r.matched_account_id)
        row_responses.append(rr)

    br = BatchResponse.model_validate(batch)
    br.detected_columns = detected_cols

    return {
        "batch": br,
        "rows_sample": row_responses,
        "stats": stats,
    }


@router.post("/batches/{batch_id}/map-and-analyze", response_model=BatchDetailResponse)
def map_and_analyze_batch(
    batch_id: int,
    payload: ColumnMappingIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_MARKETING])),
):
    """
    Stages 2 & 3: Saves column mapping, executes normalization and collision detection,
    and returns collision analytics.
    """
    try:
        analyze_and_map_batch(db, batch_id, payload.mapping)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analizando el lote: {str(e)}")

    return get_batch_detail(batch_id, db, current_user)


@router.post("/batches/{batch_id}/consolidate", response_model=ConsolidationResult)
def consolidate_batch_endpoint(
    batch_id: int,
    payload: ConsolidateBatchIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_MARKETING])),
):
    """
    Stage 4: Consolidates the staging rows into official CRM accounts according
    to the selected resolution strategy (SKIP, UPDATE_EMPTY, OVERWRITE).
    """
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    if batch.status == ImportBatchStatus.CONSOLIDATED:
        raise HTTPException(status_code=400, detail="Este lote ya ha sido consolidado previamente")

    try:
        res = consolidate_batch(
            db=db,
            batch_id=batch_id,
            resolution_strategy=payload.resolution_strategy,
            assign_to_user_id=payload.assign_to_user_id,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consolidar el lote: {str(e)}")
