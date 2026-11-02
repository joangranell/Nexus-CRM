from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.database import get_db
from app.models.accounts import Account, LifecycleStage, SubStatus, ClientType
from app.models.opportunities import Opportunity, OpportunityStatus
from app.models.interactions import Interaction, InteractionType
from app.models.tasks import Task, TaskPriority, TaskOrigin
from app.models.users import User, UserRole
from app.schemas.accounts import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
    AccountDetailResponse,
    FunnelMetrics,
    QualifyAccountIn,
)
from app.services.auth import get_current_user, require_role
from app.services.state_machine import recycle_stale_potentials

router = APIRouter(prefix="/accounts", tags=["Cuentas"])


def _build_account_response(account: Account) -> dict:
    total_pipeline = sum(
        opp.estimated_amount for opp in account.opportunities if opp.status == OpportunityStatus.ABIERTA
    )
    billing_name = account.billing_account.company_name if account.billing_account else None
    final_clients_total = len(account.final_client_accounts) if account.final_client_accounts else 0

    return {
        "id": account.id,
        "company_name": account.company_name,
        "contact_name": account.contact_name,
        "email": account.email,
        "email_valid": account.email_valid,
        "phone": account.phone,
        "tax_id": account.tax_id,
        "erp_customer_id": account.erp_customer_id,
        "source": account.source,
        "opt_in_marketing": account.opt_in_marketing,
        "lifecycle_stage": account.lifecycle_stage,
        "sub_status": account.sub_status,
        "client_type": account.client_type,
        "billing_account_id": account.billing_account_id,
        "billing_account_name": billing_name,
        "final_clients_count": final_clients_total,
        "cdi_count": final_clients_total,
        "owner_id": account.owner_id,
        "owner_name": account.owner.name if account.owner else None,
        "ai_summary": account.ai_summary,
        "first_order_date": account.first_order_date,
        "last_activity_at": account.last_activity_at,
        "created_at": account.created_at,
        "opportunities_count": len(account.opportunities),
        "total_pipeline_value": total_pipeline,
    }


@router.get("/distributors", response_model=List[AccountResponse])
def list_distributors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists accounts that can act as billing distributors for final client accounts."""
    distributors = (
        db.query(Account)
        .options(joinedload(Account.owner), joinedload(Account.opportunities))
        .filter(
            or_(
                Account.client_type == ClientType.DISTRIBUIDOR,
                Account.lifecycle_stage == LifecycleStage.CLIENTE,
            )
        )
        .order_by(Account.company_name.asc())
        .all()
    )
    return [_build_account_response(d) for d in distributors]


@router.get("/funnel-metrics", response_model=FunnelMetrics)
def get_funnel_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculates counts and conversion indicators for the 4-stage sales funnel and client types."""
    total_leads = db.query(Account).filter(Account.lifecycle_stage == LifecycleStage.LEAD).count()
    unassigned_leads = (
        db.query(Account)
        .filter(Account.lifecycle_stage == LifecycleStage.LEAD, Account.owner_id.is_(None))
        .count()
    )
    prospectos = db.query(Account).filter(Account.lifecycle_stage == LifecycleStage.PROSPECTO).count()
    potenciales = db.query(Account).filter(Account.lifecycle_stage == LifecycleStage.POTENCIAL).count()
    clientes = db.query(Account).filter(Account.lifecycle_stage == LifecycleStage.CLIENTE).count()
    inactivos = db.query(Account).filter(Account.lifecycle_stage == LifecycleStage.INACTIVO).count()

    distribuidores_count = db.query(Account).filter(Account.client_type == ClientType.DISTRIBUIDOR).count()
    final_clients_count = db.query(Account).filter(Account.client_type == ClientType.CLIENTE_FINAL).count()

    leads_sin_contactar = (
        db.query(Account)
        .filter(Account.lifecycle_stage == LifecycleStage.LEAD, Account.sub_status == SubStatus.SIN_CONTACTAR)
        .count()
    )
    leads_intento_1 = (
        db.query(Account)
        .filter(Account.lifecycle_stage == LifecycleStage.LEAD, Account.sub_status == SubStatus.INTENTO_1)
        .count()
    )
    leads_intento_2 = (
        db.query(Account)
        .filter(Account.lifecycle_stage == LifecycleStage.LEAD, Account.sub_status == SubStatus.INTENTO_2)
        .count()
    )

    # Conversion rate: Lead -> Prospecto
    lead_prosp_pool = total_leads + prospectos
    conv_lead_prosp = (prospectos / lead_prosp_pool * 100.0) if lead_prosp_pool > 0 else 0.0

    # Conversion rate: Prospecto -> Potencial
    prosp_pot_pool = prospectos + potenciales
    conv_prosp_pot = (potenciales / prosp_pot_pool * 100.0) if prosp_pot_pool > 0 else 0.0

    # Conversion rate: Potencial -> Cliente
    pot_pool = potenciales + clientes
    conv_pot_cli = (clientes / pot_pool * 100.0) if pot_pool > 0 else 0.0

    # Global lead to potential
    global_lead_pool = total_leads + prospectos + potenciales
    conv_lead_pot = (potenciales / global_lead_pool * 100.0) if global_lead_pool > 0 else 0.0

    return {
        "total_leads": total_leads,
        "unassigned_leads": unassigned_leads,
        "prospectos": prospectos,
        "potenciales": potenciales,
        "clientes": clientes,
        "inactivos": inactivos,
        "distribuidores_count": distribuidores_count,
        "final_clients_count": final_clients_count,
        "cdi_count": final_clients_count,
        "leads_sin_contactar": leads_sin_contactar,
        "leads_intento_1": leads_intento_1,
        "leads_intento_2": leads_intento_2,
        "conversion_rate_lead_to_prospecto": round(conv_lead_prosp, 1),
        "conversion_rate_prospecto_to_potencial": round(conv_prosp_pot, 1),
        "conversion_rate_lead_to_potencial": round(conv_lead_pot, 1),
        "conversion_rate_potencial_to_cliente": round(conv_pot_cli, 1),
    }


@router.get("", response_model=List[AccountResponse])
def list_accounts(
    stage: Optional[LifecycleStage] = None,
    sub_status: Optional[SubStatus] = None,
    client_type: Optional[ClientType] = None,
    billing_account_id: Optional[int] = None,
    owner_id: Optional[int] = None,
    unassigned_only: bool = False,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List accounts with flexible filtering by stage, sub_status, client_type, distributor, and search.
    """
    query = (
        db.query(Account)
        .options(
            joinedload(Account.owner),
            joinedload(Account.opportunities),
            joinedload(Account.billing_account),
            joinedload(Account.final_client_accounts),
        )
    )

    if stage:
        query = query.filter(Account.lifecycle_stage == stage)

    if sub_status:
        query = query.filter(Account.sub_status == sub_status)

    if client_type:
        query = query.filter(Account.client_type == client_type)

    if billing_account_id:
        query = query.filter(Account.billing_account_id == billing_account_id)

    if unassigned_only:
        query = query.filter(Account.owner_id.is_(None))
    elif owner_id is not None:
        query = query.filter(Account.owner_id == owner_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Account.company_name.ilike(search_pattern),
                Account.contact_name.ilike(search_pattern),
                Account.email.ilike(search_pattern),
                Account.phone.ilike(search_pattern),
                Account.tax_id.ilike(search_pattern),
            )
        )

    query = query.order_by(Account.last_activity_at.desc())
    accounts = query.offset(offset).limit(limit).all()

    return [_build_account_response(acc) for acc in accounts]


@router.get("/stale/preview", response_model=List[AccountResponse])
def preview_stale_potentials(
    days: int = 60,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Previews PROSPECTO and POTENCIAL accounts that have been inactive for > X days."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    stale_accounts = (
        db.query(Account)
        .options(joinedload(Account.owner), joinedload(Account.opportunities))
        .filter(
            Account.lifecycle_stage.in_([LifecycleStage.PROSPECTO, LifecycleStage.POTENCIAL]),
            Account.first_order_date.is_(None),
            Account.last_activity_at < cutoff,
        )
        .all()
    )
    return [_build_account_response(acc) for acc in stale_accounts]


@router.post("/stale/recycle")
def run_recycle_stale(
    days: int = 60,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_MARKETING])),
):
    """Executes recycling of inactive prospectos and potentials back into common lead pool."""
    recycled = recycle_stale_potentials(db, days=days)
    return {
        "message": f"Se han reciclado {len(recycled)} cuentas inactivas a la Bolsa Común de Leads",
        "count": len(recycled),
        "recycled_ids": [acc.id for acc in recycled],
    }


@router.post("/{account_id}/qualify", response_model=AccountResponse)
def qualify_account(
    account_id: int,
    payload: QualifyAccountIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Qualifies a LEAD into PROSPECTO and defines its typology (DISTRIBUIDOR vs CLIENTE_FINAL).
    If CLIENTE_FINAL: requires mandatory billing distributor (Cliente Factura).
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    if payload.client_type in (ClientType.CLIENTE_FINAL, "CDI"):
        if not payload.billing_account_id:
            raise HTTPException(
                status_code=400,
                detail="Para cualificar una cuenta de tipo Cliente Final es obligatorio indicar el Distribuidor Asociado (Cliente Factura).",
            )
        dist = db.query(Account).filter(Account.id == payload.billing_account_id).first()
        if not dist:
            raise HTTPException(status_code=404, detail="El Distribuidor Asociado seleccionado no existe.")
        account.billing_account_id = dist.id
    else:
        account.billing_account_id = None

    account.client_type = payload.client_type

    # Promote to PROSPECTO if it was in LEAD
    now = datetime.utcnow()
    old_stage = account.lifecycle_stage
    if account.lifecycle_stage == LifecycleStage.LEAD:
        account.lifecycle_stage = LifecycleStage.PROSPECTO
        account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO
        if account.owner_id is None:
            account.owner_id = current_user.id

        # Schedule follow-up task
        task = Task(
            account_id=account.id,
            assigned_to_id=current_user.id,
            title=f"Cualificación completada ({payload.client_type.value}): Definir propuesta para {account.company_name}",
            due_date=now + timedelta(days=5),
            priority=TaskPriority.NORMAL,
            origin=TaskOrigin.STATE_MACHINE,
            is_completed=False,
            created_at=now,
        )
        db.add(task)

    # Add audit interaction
    dist_text = f" con Distribuidor Factura #{account.billing_account_id}" if account.billing_account_id else ""
    summary_text = (
        f"Cualificación comercial registrada: tipología '{payload.client_type.value}'{dist_text}. "
        + (f"Promovido de {old_stage.value} a PROSPECTO. " if old_stage == LifecycleStage.LEAD else "")
        + (f"Notas: {payload.notes}" if payload.notes else "")
    )
    note = Interaction(
        account_id=account.id,
        user_id=current_user.id,
        type=InteractionType.NOTE,
        summary=summary_text,
        created_at=now,
    )
    db.add(note)
    account.last_activity_at = now
    db.commit()
    db.refresh(account)
    return _build_account_response(account)


@router.get("/{account_id}", response_model=AccountDetailResponse)
def get_account_detail(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns 360 degree view of account including opportunities, interactions, tasks and final clients."""
    account = (
        db.query(Account)
        .options(
            joinedload(Account.owner),
            joinedload(Account.opportunities),
            joinedload(Account.interactions).joinedload(Interaction.user),
            joinedload(Account.tasks).joinedload(Task.assigned_to),
            joinedload(Account.billing_account),
            joinedload(Account.final_client_accounts),
        )
        .filter(Account.id == account_id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    res = _build_account_response(account)
    res["opportunities"] = account.opportunities
    res["interactions"] = [
        {
            "id": i.id,
            "account_id": i.account_id,
            "user_id": i.user_id,
            "user_name": i.user.name if i.user else "Sistema",
            "type": i.type,
            "summary": i.summary,
            "created_at": i.created_at,
        }
        for i in sorted(account.interactions, key=lambda x: x.created_at, reverse=True)
    ]
    res["tasks"] = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "account_company_name": account.company_name,
            "assigned_to_id": t.assigned_to_id,
            "assigned_to_name": t.assigned_to.name if t.assigned_to else None,
            "title": t.title,
            "due_date": t.due_date,
            "priority": t.priority,
            "is_completed": t.is_completed,
            "origin": t.origin,
            "created_at": t.created_at,
        }
        for t in sorted(account.tasks, key=lambda x: x.due_date)
    ]
    final_clients_list = [
        {
            "id": c.id,
            "company_name": c.company_name,
            "tax_id": c.tax_id,
            "contact_name": c.contact_name,
            "email": c.email,
            "phone": c.phone,
            "lifecycle_stage": c.lifecycle_stage.value,
            "last_activity_at": c.last_activity_at,
        }
        for c in (account.final_client_accounts or [])
    ]
    res["final_client_accounts"] = final_clients_list
    res["cdi_accounts"] = final_clients_list
    return res


@router.post("", response_model=AccountResponse)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually creates an account with validation for Cliente Final hierarchy."""
    if payload.client_type in (ClientType.CLIENTE_FINAL, "CDI") and not payload.billing_account_id:
        raise HTTPException(
            status_code=400,
            detail="Para un cliente de tipo Cliente Final es obligatorio indicar el Distribuidor Asociado (Cliente Factura).",
        )

    account = Account(
        company_name=payload.company_name.strip(),
        contact_name=payload.contact_name,
        email=payload.email.lower().strip() if payload.email else None,
        email_valid=payload.email_valid,
        phone=payload.phone,
        tax_id=payload.tax_id.upper().replace("-", "").replace(" ", "") if payload.tax_id else None,
        source=payload.source,
        opt_in_marketing=payload.opt_in_marketing,
        lifecycle_stage=payload.lifecycle_stage,
        sub_status=payload.sub_status,
        client_type=payload.client_type,
        billing_account_id=payload.billing_account_id,
        owner_id=payload.owner_id or (current_user.id if payload.lifecycle_stage != LifecycleStage.LEAD else None),
        ai_summary=payload.ai_summary,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _build_account_response(account)


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates account fields with Cliente Final hierarchy validation."""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"]:
        update_data["email"] = update_data["email"].lower().strip()
    if "tax_id" in update_data and update_data["tax_id"]:
        update_data["tax_id"] = update_data["tax_id"].upper().replace("-", "").replace(" ", "")

    new_type = update_data.get("client_type", account.client_type)
    new_billing = update_data.get("billing_account_id", account.billing_account_id)
    if new_type in (ClientType.CLIENTE_FINAL, "CDI") and not new_billing:
        raise HTTPException(
            status_code=400,
            detail="Para una cuenta de tipo Cliente Final es obligatorio indicar el Distribuidor Asociado (Cliente Factura).",
        )

    for field, val in update_data.items():
        setattr(account, field, val)

    account.last_activity_at = datetime.utcnow()
    db.commit()
    db.refresh(account)
    return _build_account_response(account)
