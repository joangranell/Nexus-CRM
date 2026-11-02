from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.config import settings
from app.models.accounts import Account, LifecycleStage, SubStatus
from app.models.interactions import Interaction, InteractionType
from app.schemas.accounts import LeadWebhookIn, AccountResponse
from app.routers.accounts import _build_account_response

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/lead", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def webhook_capture_lead(
    payload: LeadWebhookIn,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """
    Public webhook endpoint for web forms and landing pages to inject leads.
    Protected by X-API-Key.
    Creates account in LEAD stage (Bolsa Común, unassigned).
    """
    if x_api_key != settings.WEBHOOK_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cabecera X-API-Key inválida",
        )

    clean_tax_id = (
        payload.tax_id.upper().replace("-", "").replace(" ", "") if payload.tax_id else None
    )
    clean_email = payload.email.lower().strip() if payload.email else None

    # Check for existing account by tax_id or email
    existing = None
    if clean_tax_id:
        existing = db.query(Account).filter(Account.tax_id == clean_tax_id).first()
    if not existing and clean_email:
        existing = db.query(Account).filter(Account.email == clean_email).first()

    if existing:
        # If exists, log an interaction note indicating a new web submission
        note = Interaction(
            account_id=existing.id,
            user_id=existing.owner_id or 1,
            type=InteractionType.NOTE,
            summary=f"Nueva solicitud web recibida desde '{payload.source}'. Notas: {payload.notes or 'Sin comentarios adicionales'}",
            created_at=datetime.utcnow(),
        )
        db.add(note)
        existing.last_activity_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return _build_account_response(existing)

    # Resolve distributor if CLIENTE_FINAL (or CDI) and distributor_tax_id provided
    billing_id = None
    if payload.client_type and getattr(payload.client_type, "value", str(payload.client_type)) in ("CLIENTE_FINAL", "CDI") and payload.distributor_tax_id:
        clean_dist_tax = payload.distributor_tax_id.upper().replace("-", "").replace(" ", "")
        dist = db.query(Account).filter(Account.tax_id == clean_dist_tax).first()
        if dist:
            billing_id = dist.id

    # Create new lead in common pool
    new_lead = Account(
        company_name=payload.company_name.strip(),
        contact_name=payload.contact_name,
        email=clean_email,
        email_valid=True,
        phone=payload.phone,
        tax_id=clean_tax_id,
        source=payload.source or "WEB_FORM",
        opt_in_marketing=True,
        lifecycle_stage=LifecycleStage.LEAD,
        sub_status=SubStatus.SIN_CONTACTAR,
        client_type=payload.client_type,
        billing_account_id=billing_id,
        owner_id=None,  # Common pool
        ai_summary=None,
        created_at=datetime.utcnow(),
        last_activity_at=datetime.utcnow(),
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    if payload.notes:
        note = Interaction(
            account_id=new_lead.id,
            user_id=1,  # System admin default
            type=InteractionType.NOTE,
            summary=f"Mensaje del formulario de captación: {payload.notes}",
            created_at=datetime.utcnow(),
        )
        db.add(note)
        db.commit()
        db.refresh(new_lead)

    return _build_account_response(new_lead)


from app.schemas.erp import ErpOrderCreate
from app.services.erp_sync import process_erp_order


@router.post("/erp/order", status_code=status.HTTP_200_OK)
def webhook_erp_order(
    payload: ErpOrderCreate,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """
    Public webhook endpoint for ERP to sync sales orders.
    Protected by X-API-Key.
    Promotes matched account from LEAD/POTENCIAL to CLIENTE on confirmed/invoiced order.
    """
    if x_api_key != settings.WEBHOOK_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cabecera X-API-Key inválida",
        )

    order, promoted, account = process_erp_order(db, payload)
    return {
        "success": True,
        "order_id": order.order_id,
        "promoted_to_cliente": promoted,
        "account_id": account.id if account else None,
        "account_company_name": account.company_name if account else None,
        "lifecycle_stage": account.lifecycle_stage.value if account else None,
        "total_amount": order.total_amount,
        "status": order.status.value,
        "message": (
            f"Pedido {order.order_id} procesado con éxito. "
            + (f"¡Cuenta '{account.company_name}' promovida a CLIENTE!" if promoted else "Caché ERP actualizada.")
        ),
    }


from typing import Dict, Any, Optional
from fastapi import Request
from app.models.mailing import MailingRecipient
from app.services.mailing_service import process_mailing_event


@router.post("/mailing/event", status_code=status.HTTP_200_OK)
async def webhook_mailing_event(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Universal webhook receiver for ESP events (Mailchimp, Brevo, Resend, or custom payload).
    Automatically maps vendor event names to CRM events:
    - hard bounce -> account.email_valid = False
    - unsubscribe/spam -> account.opt_in_marketing = False
    - high intent link click -> creates HIGH_INTENT task for sales commercial in Mi Día
    """
    try:
        body: Dict[str, Any] = await request.json()
    except Exception:
        # Some providers (like Mailchimp) may send form-data or urlencoded
        form_data = await request.form()
        body = dict(form_data)

    event_type = ""
    email = ""
    url_clicked = None
    recipient_id = body.get("recipient_id")
    campaign_id = body.get("campaign_id")

    # 1. Determine vendor format
    # Mailchimp format: {"type": "unsubscribe", "data[email]": "..."}
    if "type" in body and ("data[email]" in body or "data" in body):
        m_type = body.get("type", "").lower()
        if m_type == "cleaned":
            event_type = "HARD_BOUNCE"
        elif m_type == "unsubscribe":
            event_type = "UNSUBSCRIBED"
        elif m_type in ("open", "opened"):
            event_type = "OPENED"
        elif m_type in ("click", "clicked"):
            event_type = "CLICKED"
        data_block = body.get("data", {})
        email = body.get("data[email]") or (data_block.get("email") if isinstance(data_block, dict) else "")

    # Brevo format: {"event": "hard_bounce", "email": "..."}
    elif "event" in body and "email" in body:
        b_event = body.get("event", "").lower()
        email = body.get("email", "")
        url_clicked = body.get("link") or body.get("url")
        if b_event in ("hard_bounce", "hardbounce"):
            event_type = "HARD_BOUNCE"
        elif b_event in ("unsubscribe", "unsubscribed"):
            event_type = "UNSUBSCRIBED"
        elif b_event in ("opened", "open"):
            event_type = "OPENED"
        elif b_event in ("click", "clicks"):
            event_type = "CLICKED"

    # Resend format: {"type": "email.bounced", "data": {"to": ["..."]}}
    elif "type" in body and str(body.get("type")).startswith("email."):
        r_type = body.get("type", "")
        data = body.get("data", {})
        to_list = data.get("to", [])
        email = to_list[0] if to_list else ""
        if "bounce" in r_type:
            event_type = "HARD_BOUNCE"
        elif "open" in r_type:
            event_type = "OPENED"
        elif "click" in r_type:
            event_type = "CLICKED"
            url_clicked = data.get("click", {}).get("link")

    # Custom / Standard format
    else:
        event_type = body.get("event_type") or body.get("event", "OPENED")
        email = body.get("email", "")
        url_clicked = body.get("url_clicked") or body.get("link")

    if not event_type:
        event_type = "OPENED"

    # Find recipient record
    recipient = None
    if recipient_id:
        recipient = db.query(MailingRecipient).filter(MailingRecipient.id == int(recipient_id)).first()
    elif email:
        clean_email = email.lower().strip()
        q = db.query(MailingRecipient).filter(MailingRecipient.email == clean_email)
        if campaign_id:
            q = q.filter(MailingRecipient.campaign_id == int(campaign_id))
        recipient = q.order_by(MailingRecipient.id.desc()).first()

    if not recipient:
        return {
            "success": False,
            "message": f"Destinatario no encontrado para email '{email}' o id '{recipient_id}'",
        }

    success, message, updated_rec = process_mailing_event(
        db,
        recipient_id=recipient.id,
        event_type=event_type,
        url_clicked=url_clicked,
        details=str(body.get("details") or ""),
    )

    return {
        "success": success,
        "message": message,
        "recipient_id": updated_rec.id if updated_rec else None,
        "status": updated_rec.status.value if updated_rec else None,
    }

