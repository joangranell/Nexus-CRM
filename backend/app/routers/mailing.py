from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.mailing import (
    MailingTemplate,
    MailingCampaign,
    MailingRecipient,
    CampaignStatus,
    RecipientStatus,
)
from app.models.accounts import Account
from app.models.users import User, UserRole
from app.services.auth import get_current_user, require_role
from app.schemas.mailing import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    SegmentEstimateIn,
    SegmentEstimateResponse,
    CampaignCreate,
    CampaignResponse,
    CampaignDetailResponse,
    CampaignStats,
    RecipientResponse,
    SandboxSimulateEventIn,
)
from app.services.mailing_service import (
    estimate_segment_metrics,
    dispatch_campaign_run,
    process_mailing_event,
    recalculate_campaign_stats,
)

router = APIRouter(prefix="/mailing", tags=["Mailing & Automatización"])


# ============================================================================
# PLANTILLAS (TEMPLATES)
# ============================================================================

@router.get("/templates", response_model=List[TemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna todas las plantillas de correo registradas."""
    return db.query(MailingTemplate).order_by(MailingTemplate.created_at.desc()).all()


@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea una nueva plantilla de correo."""
    template = MailingTemplate(
        name=payload.name.strip(),
        subject=payload.subject.strip(),
        body_html=payload.body_html,
        high_intent_links=payload.high_intent_links or [],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/templates/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(MailingTemplate).filter(MailingTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return template


@router.put("/templates/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    payload: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(MailingTemplate).filter(MailingTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    if payload.name is not None:
        template.name = payload.name.strip()
    if payload.subject is not None:
        template.subject = payload.subject.strip()
    if payload.body_html is not None:
        template.body_html = payload.body_html
    if payload.high_intent_links is not None:
        template.high_intent_links = payload.high_intent_links

    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_MARKETING])),
):
    template = db.query(MailingTemplate).filter(MailingTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    db.delete(template)
    db.commit()
    return None


# ============================================================================
# ESTIMADOR DE SEGMENTACIÓN DINÁMICA
# ============================================================================

@router.post("/estimate-segment", response_model=SegmentEstimateResponse)
def estimate_segment(
    payload: SegmentEstimateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calcula en tiempo real cuántos destinatarios coinciden con los criterios de segmentación,
    cuántos son elegibles y cuántos quedan excluidos por falta de consentimiento o email inválido.
    """
    res = estimate_segment_metrics(
        db,
        target_stage=payload.target_stage,
        filters=payload.segment_filters,
    )
    return res


# ============================================================================
# CAMPAÑAS (CAMPAIGNS)
# ============================================================================

def _build_campaign_response(camp: MailingCampaign) -> CampaignResponse:
    return CampaignResponse(
        id=camp.id,
        name=camp.name,
        template_id=camp.template_id,
        template_name=camp.template.name if camp.template else None,
        template_subject=camp.template.subject if camp.template else None,
        target_stage=camp.target_stage,
        segment_filters=camp.segment_filters or {},
        provider_used=camp.provider_used,
        status=camp.status,
        stats=camp.stats or {},
        created_at=camp.created_at,
        sent_at=camp.sent_at,
    )


@router.get("/campaigns", response_model=List[CampaignResponse])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna todas las campañas de mailing ordenadas por fecha reciente."""
    campaigns = db.query(MailingCampaign).order_by(MailingCampaign.created_at.desc()).all()
    return [_build_campaign_response(c) for c in campaigns]


@router.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea una nueva campaña en borrador."""
    template = db.query(MailingTemplate).filter(MailingTemplate.id == payload.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="La plantilla seleccionada no existe")

    campaign = MailingCampaign(
        name=payload.name.strip(),
        template_id=payload.template_id,
        target_stage=payload.target_stage,
        segment_filters=payload.segment_filters,
        provider_used=payload.provider_used or "sandbox",
        status=CampaignStatus.DRAFT,
        stats={},
        created_by_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _build_campaign_response(campaign)


@router.get("/campaigns/{campaign_id}", response_model=CampaignDetailResponse)
def get_campaign_detail(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna detalles completos de la campaña, estadísticas calculadas y muestra de destinatarios."""
    campaign = db.query(MailingCampaign).filter(MailingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    recalculate_campaign_stats(db, campaign.id)
    db.refresh(campaign)

    # Fetch recent recipients sample
    recipients = (
        db.query(MailingRecipient)
        .filter(MailingRecipient.campaign_id == campaign.id)
        .order_by(MailingRecipient.last_event_at.desc())
        .limit(20)
        .all()
    )

    rec_list = []
    for r in recipients:
        rec_list.append(
            RecipientResponse(
                id=r.id,
                campaign_id=r.campaign_id,
                account_id=r.account_id,
                account_company_name=r.account.company_name if r.account else None,
                account_stage=r.account.lifecycle_stage.value if r.account else None,
                email=r.email,
                status=r.status,
                rendered_subject=r.rendered_subject,
                last_event_at=r.last_event_at,
                event_details=r.event_details,
            )
        )

    st = campaign.stats or {}
    stats_obj = CampaignStats(
        total_recipients=st.get("total_recipients", 0),
        sent=st.get("sent", 0),
        delivered=st.get("delivered", 0),
        opened=st.get("opened", 0),
        clicked=st.get("clicked", 0),
        high_intent_clicked=st.get("high_intent_clicked", 0),
        hard_bounce=st.get("hard_bounce", 0),
        soft_bounce=st.get("soft_bounce", 0),
        unsubscribed=st.get("unsubscribed", 0),
        spam=st.get("spam", 0),
        open_rate=st.get("open_rate", 0.0),
        click_rate=st.get("click_rate", 0.0),
        high_intent_rate=st.get("high_intent_rate", 0.0),
    )

    return CampaignDetailResponse(
        campaign=_build_campaign_response(campaign),
        template=TemplateResponse.model_validate(campaign.template),
        stats=stats_obj,
        recipients_sample=rec_list,
    )


@router.post("/campaigns/{campaign_id}/send")
def execute_campaign_send(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN_MARKETING])),
):
    """Dispara el envío de la campaña a todos los destinatarios elegibles del segmento."""
    success, message, campaign = dispatch_campaign_run(db, campaign_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message,
        "campaign": _build_campaign_response(campaign),
    }


@router.get("/campaigns/{campaign_id}/recipients", response_model=List[RecipientResponse])
def get_campaign_recipients(
    campaign_id: int,
    status_filter: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista destinatarios de una campaña con filtros opcionales por estado."""
    query = db.query(MailingRecipient).filter(MailingRecipient.campaign_id == campaign_id)
    if status_filter:
        try:
            stat_enum = RecipientStatus(status_filter.upper())
            query = query.filter(MailingRecipient.status == stat_enum)
        except ValueError:
            pass

    recs = query.order_by(MailingRecipient.last_event_at.desc()).limit(limit).all()
    return [
        RecipientResponse(
            id=r.id,
            campaign_id=r.campaign_id,
            account_id=r.account_id,
            account_company_name=r.account.company_name if r.account else None,
            account_stage=r.account.lifecycle_stage.value if r.account else None,
            email=r.email,
            status=r.status,
            rendered_subject=r.rendered_subject,
            last_event_at=r.last_event_at,
            event_details=r.event_details,
        )
        for r in recs
    ]


@router.get("/recipients/{recipient_id}")
def get_recipient_rendered(
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permite previsualizar el correo HTML final y asunto exactamente como le llegó al destinatario."""
    rec = db.query(MailingRecipient).filter(MailingRecipient.id == recipient_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Destinatario no encontrado")

    return {
        "id": rec.id,
        "campaign_id": rec.campaign_id,
        "account_id": rec.account_id,
        "company_name": rec.account.company_name if rec.account else None,
        "email": rec.email,
        "status": rec.status.value,
        "rendered_subject": rec.rendered_subject,
        "rendered_html": rec.rendered_html,
        "last_event_at": rec.last_event_at,
        "event_details": rec.event_details,
    }


# ============================================================================
# SIMULADOR SANDBOX DE EVENTOS
# ============================================================================

@router.post("/sandbox/simulate-event")
def sandbox_simulate_event(
    payload: SandboxSimulateEventIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Simula en vivo la recepción de un evento de mailing (OPENED, CLICKED, HIGH_INTENT_CLICKED, HARD_BOUNCE, UNSUBSCRIBED).
    Demuestra:
    - Higiene de datos en tiempo real (HARD_BOUNCE desactiva email_valid; UNSUBSCRIBED desactiva opt_in).
    - Regla de Oro Marketing -> Ventas (HIGH_INTENT_CLICKED genera Tarea en Mi Día sin saltarse la máquina de estados).
    """
    success, message, recipient = process_mailing_event(
        db,
        recipient_id=payload.recipient_id,
        event_type=payload.event_type,
        url_clicked=payload.url_clicked,
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message,
        "recipient_id": recipient.id,
        "status": recipient.status.value,
        "account_id": recipient.account_id,
        "account_stage": recipient.account.lifecycle_stage.value if recipient.account else None,
        "account_email_valid": recipient.account.email_valid if recipient.account else None,
        "account_opt_in": recipient.account.opt_in_marketing if recipient.account else None,
    }
