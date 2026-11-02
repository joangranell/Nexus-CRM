import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.accounts import Account, LifecycleStage
from app.models.erp import ErpOrderCache
from app.models.mailing import (
    MailingTemplate,
    MailingCampaign,
    MailingRecipient,
    CampaignStatus,
    RecipientStatus,
)
from app.models.tasks import Task, TaskPriority, TaskOrigin
from app.models.interactions import Interaction, InteractionType
from app.models.users import User, UserRole
from app.services.mailing_provider import get_mailing_provider

logger = logging.getLogger("mailing_service")


def render_template_variables(
    text: str,
    account: Account,
    commercial_user: Optional[User] = None,
) -> str:
    """Substitutes dynamic tags {{nombre}}, {{empresa}}, {{comercial}}, etc."""
    if not text:
        return ""

    contact_name = account.contact_name or "Estimado cliente"
    company_name = account.company_name or "su empresa"
    comm_name = commercial_user.name if commercial_user else (account.owner.name if account.owner else "Equipo Comercial Nexus")
    comm_email = commercial_user.email if commercial_user else (account.owner.email if account.owner else "ventas@nexuscrm.com")

    replacements = {
        "{{nombre}}": contact_name,
        "{{contacto}}": contact_name,
        "{{empresa}}": company_name,
        "{{comercial}}": comm_name,
        "{{email_comercial}}": comm_email,
        "{{email}}": account.email or "",
        "{{telefono}}": account.phone or "",
        "{{cif}}": account.tax_id or "",
        "{{fecha}}": datetime.now().strftime("%d/%m/%Y"),
    }

    rendered = text
    for key, val in replacements.items():
        rendered = rendered.replace(key, val)
    return rendered


def get_segment_query(
    db: Session,
    target_stage: str = "ALL",
    filters: Optional[Dict[str, Any]] = None,
    enforce_consent_and_validity: bool = True,
):
    """
    Constructs the SQLAlchemy query applying embudo stage and segment filters.
    If enforce_consent_and_validity is True, strictly filters email_valid=True and opt_in_marketing=True.
    """
    filters = filters or {}
    query = db.query(Account).filter(Account.email.isnot(None), Account.email != "")

    if enforce_consent_and_validity:
        query = query.filter(
            Account.email_valid == True,
            Account.opt_in_marketing == True,
        )

    # 1. Target stage filter
    if target_stage and target_stage.upper() != "ALL":
        try:
            stage_enum = LifecycleStage(target_stage.upper())
            query = query.filter(Account.lifecycle_stage == stage_enum)
        except ValueError:
            pass

    # 2. Source filter
    source = filters.get("source")
    if source:
        query = query.filter(Account.source == source)

    # 3. Minimum days inactive filter
    min_days_inactive = filters.get("min_days_inactive")
    if min_days_inactive and int(min_days_inactive) > 0:
        cutoff = datetime.utcnow() - timedelta(days=int(min_days_inactive))
        query = query.filter(Account.last_activity_at <= cutoff)

    # 4. Potentials with no orders filter
    if filters.get("has_no_orders"):
        query = query.filter(Account.first_order_date.is_(None))

    # 5. Product filter for Clients (cross-sell)
    purchased_product = filters.get("purchased_product")
    if purchased_product:
        # Match accounts having at least one ERP order containing this product
        matching_acc_ids = (
            db.query(ErpOrderCache.account_id)
            .filter(ErpOrderCache.top_products.like(f"%{purchased_product}%"))
            .subquery()
        )
        query = query.filter(Account.id.in_(matching_acc_ids))

    # 6. Client Typology filter (DISTRIBUIDOR, CLIENTE_FINAL, or ALL)
    client_type = filters.get("client_type")
    if client_type and client_type.upper() != "ALL":
        try:
            from app.models.accounts import ClientType
            query = query.filter(Account.client_type == ClientType(client_type.upper()))
        except ValueError:
            pass

    return query


def estimate_segment_metrics(
    db: Session,
    target_stage: str = "ALL",
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Calculates eligible recipients vs excluded due to hygiene/consent policies."""
    filters = filters or {}
    # Total matching segment criteria regardless of consent
    raw_query = get_segment_query(db, target_stage, filters, enforce_consent_and_validity=False)
    all_matching = raw_query.all()

    eligible = []
    excluded_no_consent = 0
    excluded_invalid_email = 0

    for acc in all_matching:
        if not acc.opt_in_marketing:
            excluded_no_consent += 1
        elif not acc.email_valid:
            excluded_invalid_email += 1
        else:
            eligible.append(acc)

    sample_list = []
    for acc in eligible[:5]:
        sample_list.append({
            "account_id": acc.id,
            "company_name": acc.company_name,
            "contact_name": acc.contact_name,
            "email": acc.email,
            "stage": acc.lifecycle_stage.value,
            "owner_name": acc.owner.name if acc.owner else "Bolsa Común",
        })

    return {
        "eligible_count": len(eligible),
        "excluded_no_consent_count": excluded_no_consent,
        "excluded_invalid_email_count": excluded_invalid_email,
        "sample_recipients": sample_list,
    }


def dispatch_campaign_run(db: Session, campaign_id: int) -> Tuple[bool, str, MailingCampaign]:
    """Executes the campaign sending using the selected provider."""
    campaign = db.query(MailingCampaign).filter(MailingCampaign.id == campaign_id).first()
    if not campaign:
        return False, "Campaña no encontrada", None

    if campaign.status == CampaignStatus.COMPLETED:
        return False, "La campaña ya ha sido enviada previamente", campaign

    template = campaign.template
    if not template:
        return False, "Plantilla no encontrada", campaign

    # Fetch eligible accounts
    query = get_segment_query(
        db,
        target_stage=campaign.target_stage,
        filters=campaign.segment_filters,
        enforce_consent_and_validity=True,
    )
    accounts = query.all()

    if not accounts:
        return False, "No hay destinatarios válidos que cumplan los criterios del segmento", campaign

    provider = get_mailing_provider(campaign.provider_used)
    campaign.status = CampaignStatus.SENDING

    recipients_batch = []
    now = datetime.utcnow()

    for acc in accounts:
        commercial = acc.owner or campaign.created_by
        rendered_subj = render_template_variables(template.subject, acc, commercial)
        rendered_body = render_template_variables(template.body_html, acc, commercial)

        rec = MailingRecipient(
            campaign_id=campaign.id,
            account_id=acc.id,
            email=acc.email,
            status=RecipientStatus.SENT,
            rendered_subject=rendered_subj,
            rendered_html=rendered_body,
            last_event_at=now,
            created_at=now,
        )
        db.add(rec)
        recipients_batch.append({
            "to_email": acc.email,
            "subject": rendered_subj,
            "body_html": rendered_body,
            "metadata": {"campaign_id": campaign.id, "account_id": acc.id},
        })

    db.commit()

    # Dispatch to provider
    provider.send_batch(recipients_batch)

    # Update campaign status and aggregated stats
    campaign.status = CampaignStatus.COMPLETED
    campaign.sent_at = datetime.utcnow()
    total_count = len(accounts)

    campaign.stats = {
        "total_recipients": total_count,
        "sent": total_count,
        "delivered": total_count,  # Sandbox auto-delivers
        "opened": 0,
        "clicked": 0,
        "high_intent_clicked": 0,
        "hard_bounce": 0,
        "soft_bounce": 0,
        "unsubscribed": 0,
        "spam": 0,
    }
    db.commit()
    db.refresh(campaign)

    return True, f"Campaña '{campaign.name}' enviada con éxito a {total_count} destinatarios.", campaign


def recalculate_campaign_stats(db: Session, campaign_id: int):
    """Refreshes aggregated stats count on MailingCampaign."""
    campaign = db.query(MailingCampaign).filter(MailingCampaign.id == campaign_id).first()
    if not campaign:
        return

    recipients = db.query(MailingRecipient).filter(MailingRecipient.campaign_id == campaign_id).all()
    stats = {
        "total_recipients": len(recipients),
        "sent": sum(1 for r in recipients if r.status != RecipientStatus.QUEUED),
        "delivered": sum(1 for r in recipients if r.status in (
            RecipientStatus.DELIVERED,
            RecipientStatus.OPENED,
            RecipientStatus.CLICKED,
            RecipientStatus.HIGH_INTENT_CLICKED,
        )),
        "opened": sum(1 for r in recipients if r.status in (
            RecipientStatus.OPENED,
            RecipientStatus.CLICKED,
            RecipientStatus.HIGH_INTENT_CLICKED,
        )),
        "clicked": sum(1 for r in recipients if r.status in (
            RecipientStatus.CLICKED,
            RecipientStatus.HIGH_INTENT_CLICKED,
        )),
        "high_intent_clicked": sum(1 for r in recipients if r.status == RecipientStatus.HIGH_INTENT_CLICKED),
        "hard_bounce": sum(1 for r in recipients if r.status == RecipientStatus.HARD_BOUNCE),
        "soft_bounce": sum(1 for r in recipients if r.status == RecipientStatus.SOFT_BOUNCE),
        "unsubscribed": sum(1 for r in recipients if r.status == RecipientStatus.UNSUBSCRIBED),
        "spam": sum(1 for r in recipients if r.status == RecipientStatus.SPAM),
    }

    delivered = max(1, stats["delivered"])
    opened = stats["opened"]
    stats["open_rate"] = round((opened / delivered) * 100, 1)
    stats["click_rate"] = round((stats["clicked"] / delivered) * 100, 1)
    stats["high_intent_rate"] = round((stats["high_intent_clicked"] / delivered) * 100, 1)

    campaign.stats = stats
    db.commit()


def process_mailing_event(
    db: Session,
    recipient_id: int,
    event_type: str,
    url_clicked: Optional[str] = None,
    details: Optional[str] = None,
) -> Tuple[bool, str, Optional[MailingRecipient]]:
    """
    Core event processor enforcing:
    1. Recipient status & campaign stats recalculation.
    2. Automatic Database Hygiene (HARD_BOUNCE -> email_valid=False; UNSUBSCRIBED -> opt_in_marketing=False).
    3. Golden Rule Bridge (HIGH_INTENT_CLICKED creates urgent Task in Mi Día without directly altering LEAD stage).
    """
    recipient = db.query(MailingRecipient).filter(MailingRecipient.id == recipient_id).first()
    if not recipient:
        return False, "Destinatario no encontrado", None

    account = recipient.account
    campaign = recipient.campaign
    template = campaign.template if campaign else None

    norm_event = event_type.upper().strip()
    now = datetime.utcnow()
    recipient.last_event_at = now

    created_task = None
    msg = f"Evento '{norm_event}' procesado para {recipient.email}"

    # Check if URL clicked is an identified "High Intent" link
    is_high_intent = False
    if norm_event == "HIGH_INTENT_CLICKED":
        is_high_intent = True
    elif norm_event == "CLICKED" and url_clicked and template:
        high_links = template.high_intent_links or []
        for hl in high_links:
            if hl.strip() and hl.strip().lower() in url_clicked.lower():
                is_high_intent = True
                norm_event = "HIGH_INTENT_CLICKED"
                break

    # 1. Update Recipient Status
    if is_high_intent:
        recipient.status = RecipientStatus.HIGH_INTENT_CLICKED
        recipient.event_details = f"Clic de Alta Intención en: {url_clicked or 'Enlace prioritario'}"
    elif norm_event == "CLICKED":
        recipient.status = RecipientStatus.CLICKED
        recipient.event_details = f"Clic en URL: {url_clicked or 'General'}"
    elif norm_event == "OPENED":
        if recipient.status in (RecipientStatus.SENT, RecipientStatus.DELIVERED):
            recipient.status = RecipientStatus.OPENED
    elif norm_event == "HARD_BOUNCE":
        recipient.status = RecipientStatus.HARD_BOUNCE
        recipient.event_details = details or "Rebote permanente: buzón inexistente"
    elif norm_event == "SOFT_BOUNCE":
        recipient.status = RecipientStatus.SOFT_BOUNCE
        recipient.event_details = details or "Rebote temporal: buzón lleno o servidor ocupado"
    elif norm_event in ("UNSUBSCRIBED", "UNSUBSCRIBE"):
        recipient.status = RecipientStatus.UNSUBSCRIBED
        recipient.event_details = "Baja voluntaria solicitada"
    elif norm_event == "SPAM":
        recipient.status = RecipientStatus.SPAM
        recipient.event_details = "Marcado como correo no deseado"

    # 2. AUTOMATIC DATABASE HYGIENE
    if norm_event == "HARD_BOUNCE" and account:
        account.email_valid = False
        note = Interaction(
            account_id=account.id,
            user_id=account.owner_id or 1,
            type=InteractionType.NOTE,
            summary=f"⚠️ Higiene de Datos: Rebote definitivo (Hard Bounce) en campaña '{campaign.name if campaign else ''}'. La dirección '{recipient.email}' ha sido marcada como INVÁLIDA.",
            created_at=now,
        )
        db.add(note)
        msg = f"Rebote definitivo registrado. La dirección {recipient.email} ha sido invalidada para futuros envíos."

    elif norm_event in ("UNSUBSCRIBED", "UNSUBSCRIBE", "SPAM") and account:
        account.opt_in_marketing = False
        note = Interaction(
            account_id=account.id,
            user_id=account.owner_id or 1,
            type=InteractionType.NOTE,
            summary=f"🔒 Privacidad: El contacto solicitó la baja de comunicaciones comerciales (Opt-out) en campaña '{campaign.name if campaign else ''}'. Se ha desactivado el consentimiento de marketing.",
            created_at=now,
        )
        db.add(note)
        msg = f"Baja registrada. {recipient.email} no recibirá más campañas de marketing."

    # 3. GOLDEN RULE: MARKETING -> SALES BRIDGE
    if is_high_intent and account:
        # Determine assigned commercial (or first active commercial / admin)
        assigned_user_id = account.owner_id
        if not assigned_user_id:
            first_comm = db.query(User).filter(User.role == UserRole.COMERCIAL, User.is_active == True).first()
            assigned_user_id = first_comm.id if first_comm else 1

        # Create Urgent High Intent Task for Mi Día
        link_desc = url_clicked or "Solicitud de Tarifa / Contacto"
        task_title = f"🔥 ALTA INTENCIÓN: {account.company_name} pulsó '{link_desc}' en campaña '{campaign.name if campaign else 'Marketing'}'"

        created_task = Task(
            account_id=account.id,
            assigned_to_id=assigned_user_id,
            title=task_title,
            due_date=now,  # Due immediately today
            priority=TaskPriority.HIGH_INTENT,
            origin=TaskOrigin.MARKETING_TRIGGER,
            is_completed=False,
            created_at=now,
        )
        db.add(created_task)

        # Log timeline note
        note = Interaction(
            account_id=account.id,
            user_id=assigned_user_id,
            type=InteractionType.NOTE,
            summary=f"🚀 Alerta de Marketing: Interés cualificado detectado. El cliente hizo clic en '{link_desc}'. Se ha asignado una tarea prioritaria de alta intención al comercial para contactar hoy mismo.",
            created_at=now,
        )
        db.add(note)
        msg = f"¡Alerta de Alta Intención! Se ha creado una tarea prioritaria en 'Mi Día' para el comercial asignado."

    db.commit()

    # Recalculate campaign metrics
    if campaign:
        recalculate_campaign_stats(db, campaign.id)

    db.refresh(recipient)
    return True, msg, recipient
