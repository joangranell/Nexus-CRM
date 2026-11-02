import csv
import json
import io
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from difflib import SequenceMatcher
from sqlalchemy.orm import Session
from sqlalchemy import or_

import openpyxl

from app.models.staging import (
    ImportBatch,
    ImportBatchStatus,
    ImportStagingRow,
    StagingRowStatus,
    CollisionType,
)
from app.models.accounts import Account, LifecycleStage, SubStatus, ClientType
from app.models.opportunities import Opportunity, OpportunityStatus
from app.models.erp import ErpOrderCache


def normalize_phone(phone_str: Optional[str]) -> Optional[str]:
    """Normalizes phone numbers to standard E.164 format (+34 default if Spanish 9 digits)."""
    if not phone_str:
        return None
    cleaned = re.sub(r"[^\d+]", "", str(phone_str))
    if not cleaned:
        return None
    if cleaned.startswith("+"):
        return cleaned
    if cleaned.startswith("00"):
        return "+" + cleaned[2:]
    if len(cleaned) == 9 and cleaned[0] in ("6", "7", "8", "9"):
        return "+34" + cleaned
    return "+" + cleaned


def normalize_tax_id(tax_id_str: Optional[str]) -> Optional[str]:
    """Normalizes tax IDs (NIF/CIF/NIE): uppercase without dashes, spaces or dots."""
    if not tax_id_str:
        return None
    return re.sub(r"[^A-Z0-9]", "", str(tax_id_str).upper())


def normalize_email(email_str: Optional[str]) -> Optional[str]:
    """Cleans and lowercases email."""
    if not email_str:
        return None
    clean = str(email_str).strip().lower()
    return clean if "@" in clean else None


def normalize_lifecycle_stage(val: Optional[str]) -> Optional[str]:
    """Normalizes stage text to standard enum string."""
    if not val:
        return None
    v = str(val).strip().upper()
    if v in ("LEAD", "PROSPECTO", "POTENCIAL", "CLIENTE", "INACTIVO"):
        return v
    if any(k in v for k in ("PROSPECT", "CUALIF")):
        return "PROSPECTO"
    if any(k in v for k in ("POTENTIAL", "OPORTUNIDAD", "NEGOCIAC")):
        return "POTENCIAL"
    if any(k in v for k in ("CUSTOMER", "CLIENT")):
        return "CLIENTE"
    if "LEAD" in v:
        return "LEAD"
    return "LEAD"


def normalize_client_type(val: Optional[str]) -> Optional[str]:
    """Normalizes client typology: DISTRIBUIDOR or CLIENTE_FINAL."""
    if not val:
        return None
    v = str(val).strip().upper()
    if any(k in v for k in ("DISTRIBUIDOR", "DISTRIBUTOR", "MAYORISTA")):
        return "DISTRIBUIDOR"
    if any(k in v for k in ("CLIENTE_FINAL", "CLIENTE FINAL", "FINAL", "INDIRECTO", "CANAL INDIRECTO", "CDI", "CLIENTE DEL DISTRIBUIDOR", "PUNTO DE VENTA", "RESTAURANTE", "TIENDA")):
        return "CLIENTE_FINAL"
    return None


def parse_float_safe(val: Any) -> float:
    """Parses numeric amounts safely handling currencies and comma/dot decimals."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("€", "").replace("EUR", "").replace("eur", "").replace(" ", "")
    if "," in s and "." in s:
        if s.find(".") < s.find(","):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_date_safe(val: Any) -> Optional[datetime]:
    """Parses date string safely across common Spanish and ISO formats."""
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s[:10] if "T" not in fmt else s, fmt)
        except ValueError:
            continue
    return None


def parse_upload_file(filename: str, content: bytes) -> Tuple[List[str], List[Dict[str, Any]], str]:
    """
    Parses CSV, XLSX or JSON files and returns (headers, rows_as_dicts, file_type).
    """
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        file_type = "csv"
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1")

        sample = text[:2048]
        delimiter = ";" if sample.count(";") > sample.count(",") else ","
        if sample.count("\t") > sample.count(delimiter):
            delimiter = "\t"

        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        headers = [h.strip() for h in (reader.fieldnames or []) if h]
        rows = []
        for r in reader:
            cleaned_row = {k.strip(): (v.strip() if v else "") for k, v in r.items() if k}
            if any(cleaned_row.values()):
                rows.append(cleaned_row)
        return headers, rows, file_type

    elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
        file_type = "xlsx"
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        sheet = wb.active
        iter_rows = sheet.iter_rows(values_only=True)
        header_row = next(iter_rows, None)
        if not header_row:
            return [], [], file_type

        headers = [str(h).strip() for h in header_row if h is not None]
        rows = []
        for row in iter_rows:
            row_dict = {}
            has_val = False
            for idx, val in enumerate(row):
                if idx < len(headers):
                    val_str = str(val).strip() if val is not None else ""
                    row_dict[headers[idx]] = val_str
                    if val_str:
                        has_val = True
            if has_val:
                rows.append(row_dict)
        return headers, rows, file_type

    elif lower_name.endswith(".json"):
        file_type = "json"
        data = json.loads(content.decode("utf-8"))
        if isinstance(data, dict):
            data = data.get("rows") or data.get("data") or [data]
        if not isinstance(data, list) or not data:
            return [], [], file_type

        headers = list({k for r in data if isinstance(r, dict) for k in r.keys()})
        rows = [r for r in data if isinstance(r, dict)]
        return headers, rows, file_type

    else:
        raise ValueError("Formato de archivo no soportado. Se admiten archivos .csv, .xlsx y .json")


def create_import_batch(
    db: Session,
    filename: str,
    content: bytes,
    user_id: Optional[int] = None,
) -> ImportBatch:
    """Stage 1: Upload and staging creation with enhanced heuristic mapping."""
    headers, rows, file_type = parse_upload_file(filename, content)
    now = datetime.utcnow()

    # Heuristic mapping for standard and new hierarchy fields
    mapping = {}
    for h in headers:
        hl = h.lower()
        if any(k in hl for k in ("empresa", "company", "razon", "nombre fiscal", "cliente")):
            if "factura" not in hl and "distribuidor" not in hl:
                mapping[h] = "company_name"
        if any(k in hl for k in ("contacto", "persona", "responsable", "contact")):
            mapping[h] = "contact_name"
        elif any(k in hl for k in ("cif", "nif", "cuit", "tax", "vat", "dni")):
            if "distribuidor" in hl or "factura" in hl:
                mapping[h] = "distributor_ref"
            else:
                mapping[h] = "tax_id"
        elif any(k in hl for k in ("correo", "email", "mail")):
            mapping[h] = "email"
        elif any(k in hl for k in ("telefono", "teléfono", "tlf", "phone", "movil", "móvil")):
            mapping[h] = "phone"
        elif any(k in hl for k in ("origen", "source", "canal", "campaña")):
            mapping[h] = "source"
        elif any(k in hl for k in ("nota", "observacion", "observaciones", "comentario", "notes")):
            mapping[h] = "notes"
        elif any(k in hl for k in ("estado", "fase", "etapa", "lifecycle", "stage")):
            mapping[h] = "lifecycle_stage"
        elif any(k in hl for k in ("tipo", "tipologia", "tipología", "client_type", "tipo_cliente")):
            mapping[h] = "client_type"
        elif any(k in hl for k in ("distribuidor", "cliente factura", "factura", "distributor", "cif_distribuidor")):
            mapping[h] = "distributor_ref"
        elif any(k in hl for k in ("importe", "amount", "valor", "presupuesto")):
            mapping[h] = "estimated_amount"
        elif any(k in hl for k in ("cierre", "close_date", "fecha_cierre", "fecha cierre")):
            mapping[h] = "expected_close_date"

    batch = ImportBatch(
        filename=filename,
        file_type=file_type,
        total_rows=len(rows),
        processed_rows=0,
        status=ImportBatchStatus.UPLOADED,
        column_mapping=mapping,
        created_by_id=user_id,
        created_at=now,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    staging_rows = []
    for idx, r in enumerate(rows):
        st_row = ImportStagingRow(
            batch_id=batch.id,
            row_index=idx + 1,
            raw_data=r,
            normalized_data={},
            collision_type=CollisionType.NONE,
            suggested_stage="LEAD",
            status=StagingRowStatus.PENDING,
        )
        staging_rows.append(st_row)

    db.add_all(staging_rows)
    db.commit()
    return batch


def analyze_and_map_batch(
    db: Session,
    batch_id: int,
    column_mapping: Dict[str, str],
) -> ImportBatch:
    """
    Stages 2 & 3: Applies user mapping, cleans/normalizes data, detects collisions,
    validates Cliente Final / Distributor dependencies, applies forecasting safeguards,
    and assigns suggested stages (LEAD, PROSPECTO, POTENCIAL, CLIENTE).
    """
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise ValueError("Lote no encontrado")

    batch.column_mapping = column_mapping

    # Preload existing accounts and ERP orders cache
    existing_accounts = db.query(Account).all()
    accounts_by_tax = {a.tax_id: a for a in existing_accounts if a.tax_id}
    accounts_by_email = {a.email.lower(): a for a in existing_accounts if a.email}
    accounts_by_name = [(a.company_name.lower(), a) for a in existing_accounts if a.company_name]
    accounts_by_customer_id = {a.erp_customer_id: a for a in existing_accounts if a.erp_customer_id}

    # Set of existing distributors in DB
    existing_distributor_taxes = {
        a.tax_id for a in existing_accounts if a.tax_id and (a.client_type == ClientType.DISTRIBUIDOR or a.client_type is None)
    }
    existing_distributor_names = {
        a.company_name.lower(): a.id for a in existing_accounts if a.company_name
    }

    # Preload tax IDs with ERP orders
    erp_orders = db.query(ErpOrderCache.tax_id).filter(ErpOrderCache.tax_id.isnot(None)).all()
    taxes_with_orders = {o.tax_id for o in erp_orders if o.tax_id}

    # Step 1: Pre-scan batch rows to discover distributors in the same batch
    batch_distributor_taxes = set()
    batch_distributor_names = set()
    for row in batch.rows:
        raw = row.raw_data or {}
        # check mapped client_type
        r_type = None
        for src_col, target_field in column_mapping.items():
            if target_field == "client_type" and src_col in raw:
                r_type = normalize_client_type(raw[src_col])
                break

        r_tax = None
        r_name = None
        for src_col, target_field in column_mapping.items():
            if target_field == "tax_id" and src_col in raw:
                r_tax = normalize_tax_id(raw[src_col])
            elif target_field == "company_name" and src_col in raw:
                r_name = str(raw[src_col]).strip().lower()

        if r_type == "DISTRIBUIDOR":
            if r_tax:
                batch_distributor_taxes.add(r_tax)
            if r_name:
                batch_distributor_names.add(r_name)

    # Step 2: Normalize and validate each row
    for row in batch.rows:
        raw = row.raw_data or {}
        norm: Dict[str, Any] = {}

        for src_col, target_field in column_mapping.items():
            if target_field and src_col in raw:
                norm[target_field] = raw[src_col]

        company = norm.get("company_name", "").strip()
        contact = norm.get("contact_name", "").strip() or None
        tax_id = normalize_tax_id(norm.get("tax_id"))
        email = normalize_email(norm.get("email"))
        phone = normalize_phone(norm.get("phone"))
        notes = norm.get("notes", "").strip() or None
        source = norm.get("source", "").strip() or "IMPORTACION_MASIVA"

        raw_stage = norm.get("lifecycle_stage")
        mapped_stage = normalize_lifecycle_stage(raw_stage) if raw_stage else None

        client_type = normalize_client_type(norm.get("client_type"))
        distributor_ref = (
            normalize_tax_id(norm.get("distributor_ref")) or str(norm.get("distributor_ref", "")).strip() or None
        )

        estimated_amount = parse_float_safe(norm.get("estimated_amount"))
        expected_close_date = parse_date_safe(norm.get("expected_close_date"))

        norm_clean = {
            "company_name": company,
            "contact_name": contact,
            "tax_id": tax_id,
            "email": email,
            "phone": phone,
            "notes": notes,
            "source": source,
            "lifecycle_stage": mapped_stage,
            "client_type": client_type,
            "distributor_ref": distributor_ref,
            "estimated_amount": estimated_amount,
            "expected_close_date": expected_close_date.isoformat() if expected_close_date else None,
        }
        row.normalized_data = norm_clean

        # Collision check
        matched_acc: Optional[Account] = None
        collision = CollisionType.NONE

        if tax_id and tax_id in accounts_by_tax:
            matched_acc = accounts_by_tax[tax_id]
            collision = CollisionType.EXACT_TAX_ID
        elif email and email in accounts_by_email:
            matched_acc = accounts_by_email[email]
            collision = CollisionType.EXACT_EMAIL
        elif company:
            lower_comp = company.lower()
            for exist_name, exist_acc in accounts_by_name:
                sim = SequenceMatcher(None, lower_comp, exist_name).ratio()
                if sim >= 0.88:
                    matched_acc = exist_acc
                    collision = CollisionType.FUZZY_NAME
                    break

        row.collision_type = collision
        row.matched_account_id = matched_acc.id if matched_acc else None

        # Hierarchy validation: CLIENTE_FINAL must reference a distributor in DB or in same batch
        row_errors = []
        if client_type in ("CLIENTE_FINAL", "CDI"):
            if not distributor_ref:
                row_errors.append("Cliente Final sin 'Cliente Factura / Distribuidor Asociado' obligatorio.")
            else:
                dist_norm_tax = normalize_tax_id(distributor_ref)
                dist_norm_name = distributor_ref.lower()
                dist_found = (
                    (dist_norm_tax and dist_norm_tax in existing_distributor_taxes)
                    or (dist_norm_name in existing_distributor_names)
                    or (dist_norm_tax and dist_norm_tax in batch_distributor_taxes)
                    or (dist_norm_name in batch_distributor_names)
                )
                if not dist_found:
                    row_errors.append(
                        f"Distribuidor '{distributor_ref}' no existe en la base de datos ni en este lote."
                    )

        # Stage Assignment & Forecasting Safeguard
        target_stage = mapped_stage

        if target_stage == "POTENCIAL":
            # Strict safeguard: require amount > 0 and close date
            if estimated_amount > 0 and expected_close_date:
                row.suggested_stage = "POTENCIAL"
            else:
                row.suggested_stage = "PROSPECTO"
                row_errors.append(
                    "Reclasificado a PROSPECTO: Para entrar como Potencial se requiere importe (€) y fecha estimada de cierre."
                )
        elif target_stage in ("PROSPECTO", "CLIENTE", "LEAD"):
            row.suggested_stage = target_stage
        else:
            # Automatic heuristic if stage wasn't mapped
            if tax_id and tax_id in taxes_with_orders:
                row.suggested_stage = "CLIENTE"
            elif notes or (matched_acc and matched_acc.lifecycle_stage == LifecycleStage.POTENCIAL):
                if estimated_amount > 0 and expected_close_date:
                    row.suggested_stage = "POTENCIAL"
                else:
                    row.suggested_stage = "PROSPECTO"
            else:
                row.suggested_stage = "LEAD"

        if row_errors:
            row.error_message = " | ".join(row_errors)
        else:
            row.error_message = None

    batch.status = ImportBatchStatus.ANALYZED
    db.commit()
    db.refresh(batch)
    return batch


def consolidate_batch(
    db: Session,
    batch_id: int,
    resolution_strategy: str = "SKIP",  # SKIP, UPDATE_EMPTY, OVERWRITE
    assign_to_user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Stage 4: Consolidates staging rows into `accounts` table following hierarchical order:
    1. First consolidates DISTRIBUIDOR accounts (and standard leads)
    2. Then consolidates CLIENTE_FINAL accounts, linking them to their billing distributor
    3. Creates opportunities for imported POTENCIAL accounts
    """
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise ValueError("Lote no encontrado")

    now = datetime.utcnow()
    created_leads = 0
    created_prospectos = 0
    created_potenciales = 0
    created_clientes = 0
    updated_existing = 0
    skipped_duplicates = 0
    errors = 0

    # Local index of distributors (both existing and newly created in this run)
    distributors_by_tax = {}
    distributors_by_name = {}

    existing_distributors = (
        db.query(Account)
        .filter(or_(Account.client_type == ClientType.DISTRIBUIDOR, Account.client_type.is_(None)))
        .all()
    )
    for d in existing_distributors:
        if d.tax_id:
            distributors_by_tax[d.tax_id] = d.id
        if d.company_name:
            distributors_by_name[d.company_name.lower().strip()] = d.id

    # Partition rows: Non-Clientes Finales first (so distributors exist), then Clientes Finales
    non_final_rows = [r for r in batch.rows if (r.normalized_data or {}).get("client_type") not in ("CLIENTE_FINAL", "CDI")]
    final_rows = [r for r in batch.rows if (r.normalized_data or {}).get("client_type") in ("CLIENTE_FINAL", "CDI")]
    ordered_rows = non_final_rows + final_rows

    for row in ordered_rows:
        try:
            norm = row.normalized_data or {}
            comp_name = norm.get("company_name")
            if not comp_name:
                row.status = StagingRowStatus.ERROR
                row.error_message = "Falta el nombre de la empresa"
                errors += 1
                continue

            # If row had fatal Cliente Final validation error
            c_type = norm.get("client_type")
            if c_type == "CDI":
                c_type = "CLIENTE_FINAL"
            dist_ref = norm.get("distributor_ref")
            billing_id = None

            if c_type == "CLIENTE_FINAL":
                # Find distributor
                if dist_ref:
                    norm_ref_tax = normalize_tax_id(dist_ref)
                    if norm_ref_tax and norm_ref_tax in distributors_by_tax:
                        billing_id = distributors_by_tax[norm_ref_tax]
                    elif dist_ref.lower().strip() in distributors_by_name:
                        billing_id = distributors_by_name[dist_ref.lower().strip()]

                if not billing_id:
                    row.status = StagingRowStatus.ERROR
                    row.error_message = f"No se pudo vincular el Cliente Final '{comp_name}' a su Distribuidor '{dist_ref}'"
                    errors += 1
                    continue

            matched_id = row.matched_account_id
            existing_acc = db.query(Account).filter(Account.id == matched_id).first() if matched_id else None

            # Handle existing collision
            if existing_acc:
                if resolution_strategy == "SKIP":
                    row.status = StagingRowStatus.SKIPPED
                    skipped_duplicates += 1
                    continue
                elif resolution_strategy == "UPDATE_EMPTY":
                    if not existing_acc.contact_name and norm.get("contact_name"):
                        existing_acc.contact_name = norm["contact_name"]
                    if not existing_acc.email and norm.get("email"):
                        existing_acc.email = norm["email"]
                    if not existing_acc.phone and norm.get("phone"):
                        existing_acc.phone = norm["phone"]
                    if not existing_acc.tax_id and norm.get("tax_id"):
                        existing_acc.tax_id = norm["tax_id"]
                    if not existing_acc.client_type and c_type:
                        existing_acc.client_type = ClientType(c_type)
                    if not existing_acc.billing_account_id and billing_id:
                        existing_acc.billing_account_id = billing_id
                    existing_acc.last_activity_at = now
                    row.status = StagingRowStatus.CONSOLIDATED
                    updated_existing += 1
                    # Register if distributor
                    if existing_acc.client_type == ClientType.DISTRIBUIDOR:
                        if existing_acc.tax_id:
                            distributors_by_tax[existing_acc.tax_id] = existing_acc.id
                        distributors_by_name[existing_acc.company_name.lower().strip()] = existing_acc.id
                    continue
                elif resolution_strategy == "OVERWRITE":
                    if norm.get("contact_name"):
                        existing_acc.contact_name = norm["contact_name"]
                    if norm.get("email"):
                        existing_acc.email = norm["email"]
                    if norm.get("phone"):
                        existing_acc.phone = norm["phone"]
                    if norm.get("tax_id"):
                        existing_acc.tax_id = norm["tax_id"]
                    if c_type:
                        existing_acc.client_type = ClientType(c_type)
                    if billing_id:
                        existing_acc.billing_account_id = billing_id
                    existing_acc.last_activity_at = now
                    row.status = StagingRowStatus.CONSOLIDATED
                    updated_existing += 1
                    if existing_acc.client_type == ClientType.DISTRIBUIDOR:
                        if existing_acc.tax_id:
                            distributors_by_tax[existing_acc.tax_id] = existing_acc.id
                        distributors_by_name[existing_acc.company_name.lower().strip()] = existing_acc.id
                    continue

            # Create new account
            stage_str = row.suggested_stage or "LEAD"
            if stage_str == "CLIENTE":
                stage_enum = LifecycleStage.CLIENTE
                created_clientes += 1
                owner = assign_to_user_id or 1
            elif stage_str == "POTENCIAL":
                stage_enum = LifecycleStage.POTENCIAL
                created_potenciales += 1
                owner = assign_to_user_id or 1
            elif stage_str == "PROSPECTO":
                stage_enum = LifecycleStage.PROSPECTO
                created_prospectos += 1
                owner = assign_to_user_id
            else:
                stage_enum = LifecycleStage.LEAD
                created_leads += 1
                owner = None  # Common pool

            client_type_enum = ClientType(c_type) if c_type else None

            new_acc = Account(
                company_name=comp_name,
                contact_name=norm.get("contact_name"),
                email=norm.get("email"),
                email_valid=True,
                phone=norm.get("phone"),
                tax_id=norm.get("tax_id"),
                source=norm.get("source") or "IMPORTACION_MASIVA",
                opt_in_marketing=True,
                lifecycle_stage=stage_enum,
                sub_status=(
                    SubStatus.SIN_CONTACTAR
                    if stage_enum == LifecycleStage.LEAD
                    else SubStatus.CONTACTADO_CUALIFICANDO
                ),
                client_type=client_type_enum,
                billing_account_id=billing_id,
                owner_id=owner,
                ai_summary=f"Importado desde el lote '{batch.filename}' el {now.strftime('%d/%m/%Y')}.",
                created_at=now,
                last_activity_at=now,
            )
            db.add(new_acc)
            db.flush()  # Obtain new_acc.id

            # Register in distributor map if applicable
            if client_type_enum == ClientType.DISTRIBUIDOR:
                if new_acc.tax_id:
                    distributors_by_tax[new_acc.tax_id] = new_acc.id
                distributors_by_name[new_acc.company_name.lower().strip()] = new_acc.id

            # If POTENCIAL, create quantified Opportunity as guaranteed by safeguard
            if stage_enum == LifecycleStage.POTENCIAL and norm.get("estimated_amount"):
                close_dt = parse_date_safe(norm.get("expected_close_date")) or (now + timedelta(days=30))
                opp = Opportunity(
                    account_id=new_acc.id,
                    owner_id=owner or 1,
                    title=f"Oportunidad inicial - {new_acc.company_name}",
                    detected_need=norm.get("notes") or "Importado con negociación activa y valor cuantificado.",
                    estimated_amount=float(norm["estimated_amount"]),
                    status=OpportunityStatus.ABIERTA,
                    expected_close_date=close_dt,
                    created_at=now,
                )
                db.add(opp)

            row.status = StagingRowStatus.CONSOLIDATED

        except Exception as e:
            row.status = StagingRowStatus.ERROR
            row.error_message = str(e)
            errors += 1

    batch.status = ImportBatchStatus.CONSOLIDATED
    batch.processed_rows = len(batch.rows)
    db.commit()

    total_created = created_leads + created_prospectos + created_potenciales + created_clientes
    return {
        "batch_id": batch.id,
        "total_processed": len(batch.rows),
        "created_leads": created_leads,
        "created_prospectos": created_prospectos,
        "created_potenciales": created_potenciales,
        "created_clientes": created_clientes,
        "updated_existing": updated_existing,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
        "message": (
            f"Consolidación completada: {total_created} cuentas nuevas creadas "
            f"({created_leads} Leads, {created_prospectos} Prospectos, {created_potenciales} Potenciales, {created_clientes} Clientes), "
            f"{updated_existing} actualizadas y {skipped_duplicates} duplicados omitidos."
        ),
    }
