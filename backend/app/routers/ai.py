from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.ai import AIConfig, AIProviderType
from app.models.users import User, UserRole
from app.models.accounts import Account, LifecycleStage, SubStatus
from app.models.opportunities import Opportunity, OpportunityStatus
from app.models.interactions import Interaction, InteractionType
from app.models.tasks import Task, TaskPriority, TaskOrigin
from app.models.erp import ErpOrderCache
from app.schemas.ai import (
    AIConfigResponse,
    AIConfigUpdate,
    AITestConnectionRequest,
    AITestConnectionResponse,
    LeadEnrichRequest,
    LeadEnrichResponse,
    VoiceToCRMRequest,
    VoiceToCRMResponse,
    EmailIntentRequest,
    EmailIntentResponse,
    ChurnRiskItem,
    ChurnAlertTaskRequest,
    MailingCopyGenRequest,
    MailingCopyGenResponse,
)
from app.services.auth import get_current_user, require_role
from app.services.ai.factory import get_active_ai_provider, get_provider_instance

router = APIRouter(prefix="/ai", tags=["Inteligencia Artificial (BYOK)"])


def _mask_key(key: Optional[str]) -> Optional[str]:
    if not key:
        return None
    if len(key) <= 8:
        return "sk-****"
    return f"{key[:4]}...{key[-4:]}"


def _get_or_create_config(db: Session) -> AIConfig:
    config = db.query(AIConfig).first()
    if not config:
        config = AIConfig(
            provider=AIProviderType.MOCK,
            is_enabled=False,
            api_key=None,
            endpoint=None,
            model_name=None,
            temperature=0.3,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


# -------------------------------------------------------------
# 1. Configuración de IA (BYOK)
# -------------------------------------------------------------
@router.get("/config", response_model=AIConfigResponse)
def get_ai_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Obtiene la configuración actual del módulo de IA.
    Enmascara la API Key por seguridad.
    """
    config = _get_or_create_config(db)
    return AIConfigResponse(
        provider=config.provider,
        is_enabled=config.is_enabled,
        has_api_key=bool(config.api_key),
        masked_key=_mask_key(config.api_key),
        endpoint=config.endpoint,
        model_name=config.model_name,
        temperature=config.temperature,
        updated_at=config.updated_at,
    )


@router.put("/config", response_model=AIConfigResponse)
def update_ai_config(
    payload: AIConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    """
    Actualiza la configuración del proveedor corporativo de IA.
    Exclusivo para el rol SUPER_ADMIN (Sistemas / IT).
    """
    config = _get_or_create_config(db)

    if payload.provider is not None:
        config.provider = payload.provider.upper()
    if payload.is_enabled is not None:
        config.is_enabled = payload.is_enabled
    if payload.api_key is not None:
        config.api_key = payload.api_key.strip() if payload.api_key else None
    if payload.endpoint is not None:
        config.endpoint = payload.endpoint.strip() if payload.endpoint else None
    if payload.model_name is not None:
        config.model_name = payload.model_name.strip() if payload.model_name else None
    if payload.temperature is not None:
        config.temperature = max(0.0, min(1.0, payload.temperature))

    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)

    return AIConfigResponse(
        provider=config.provider,
        is_enabled=config.is_enabled,
        has_api_key=bool(config.api_key),
        masked_key=_mask_key(config.api_key),
        endpoint=config.endpoint,
        model_name=config.model_name,
        temperature=config.temperature,
        updated_at=config.updated_at,
    )


@router.post("/test-connection", response_model=AITestConnectionResponse)
def test_ai_connection(
    payload: AITestConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    """
    Prueba en tiempo real la conexión con el proveedor configurado o con credenciales en borrador.
    """
    config = _get_or_create_config(db)

    provider_type = payload.provider or config.provider
    api_key = payload.api_key if payload.api_key is not None else config.api_key
    endpoint = payload.endpoint if payload.endpoint is not None else config.endpoint
    model_name = payload.model_name if payload.model_name is not None else config.model_name

    provider_instance = get_provider_instance(
        provider_type=provider_type,
        api_key=api_key,
        endpoint=endpoint,
        model_name=model_name,
        temperature=config.temperature,
    )

    result = provider_instance.test_connection()
    return AITestConnectionResponse(**result)


# -------------------------------------------------------------
# 2. Casos de Uso de Negocio B2B
# -------------------------------------------------------------
def _check_ai_active(db: Session):
    provider = get_active_ai_provider(db, require_enabled=True)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El Asistente de IA está deshabilitado en este momento. Actívelo en Configuración de IA (BYOK).",
        )
    return provider


# Caso a: AI Lead Enricher
@router.post("/lead-enrich", response_model=LeadEnrichResponse)
def enrich_lead(
    payload: LeadEnrichRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Caso a: Analiza la empresa y enriquece su ficha con resumen de actividad, sector y tamaño estimado.
    Persiste automáticamente el resultado en `account.ai_summary`.
    """
    ai = _check_ai_active(db)

    account = db.query(Account).filter(Account.id == payload.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")

    domain = None
    if account.email and "@" in account.email:
        domain = account.email.split("@")[-1]

    result = ai.enrich_lead(
        company_name=account.company_name,
        email=account.email,
        domain=domain,
    )

    account.ai_summary = result.get("ai_summary")
    account.last_activity_at = datetime.utcnow()
    db.commit()

    return LeadEnrichResponse(
        account_id=account.id,
        company_name=account.company_name,
        ai_summary=result.get("ai_summary", ""),
        estimated_sector=result.get("estimated_sector", "General B2B"),
        estimated_size=result.get("estimated_size", "Pyme B2B"),
        key_value_prop=result.get("key_value_prop", ""),
        suggested_next_step=result.get("suggested_next_step", ""),
    )


# Caso b: Voice-to-CRM (Dictado Post-Visita)
@router.post("/voice-to-crm", response_model=VoiceToCRMResponse)
def voice_to_crm(
    payload: VoiceToCRMRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Caso b: Procesa el dictado comercial post-visita en lenguaje natural.
    Reglas de negocio:
    - Si se detecta importe (€) y fecha: crea Oportunidad y promueve a POTENCIAL.
    - Si solo son notas de conversación: promueve LEAD a PROSPECTO.
    - Registra interacción y tarea de seguimiento con fecha calculada.
    """
    ai = _check_ai_active(db)

    account = None
    if payload.account_id:
        account = db.query(Account).filter(Account.id == payload.account_id).first()

    company_name = account.company_name if account else payload.company_name
    parsed = ai.parse_voice_interaction(transcript=payload.transcript, company_name=company_name)

    summary = parsed.get("summary", payload.transcript)
    interaction_type_str = parsed.get("interaction_type", "CALL_EFFECTIVE")
    try:
        interaction_type = InteractionType[interaction_type_str]
    except KeyError:
        interaction_type = InteractionType.CALL_EFFECTIVE

    detected_amount = parsed.get("detected_amount")
    detected_close_date = parsed.get("detected_close_date")
    next_followup_days = parsed.get("next_followup_days", 7)
    opp_title = parsed.get("opportunity_title")

    promoted_to_potencial = False
    promoted_to_prospecto = False
    opp_created = False
    interaction_id = None
    task_id = None

    if account:
        # 1. Registrar interacción
        interaction = Interaction(
            account_id=account.id,
            user_id=current_user.id,
            type=interaction_type,
            summary=f"[Dictado por Voz]: {summary}",
            created_at=datetime.utcnow(),
        )
        db.add(interaction)
        db.flush()
        interaction_id = interaction.id

        # 2. Evaluar importe y transición de etapa
        if detected_amount and detected_amount > 0:
            # Crear Oportunidad
            close_dt = None
            if detected_close_date:
                try:
                    close_dt = datetime.strptime(detected_close_date, "%Y-%m-%d")
                except ValueError:
                    close_dt = datetime.utcnow() + timedelta(days=30)
            else:
                close_dt = datetime.utcnow() + timedelta(days=30)

            title = opp_title or f"Oportunidad dictada {account.company_name}"
            opp = Opportunity(
                account_id=account.id,
                owner_id=account.owner_id or current_user.id,
                title=title,
                estimated_amount=float(detected_amount),
                status=OpportunityStatus.ABIERTA,
                expected_close_date=close_dt,
                detected_need=summary,
                created_at=datetime.utcnow(),
            )
            db.add(opp)
            opp_created = True

            # Promoción directa a POTENCIAL
            if account.lifecycle_stage in [LifecycleStage.LEAD, LifecycleStage.PROSPECTO]:
                account.lifecycle_stage = LifecycleStage.POTENCIAL
                account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO
                promoted_to_potencial = True
        else:
            # Si solo hubo conversación y era LEAD, cualificar a PROSPECTO
            if account.lifecycle_stage == LifecycleStage.LEAD:
                account.lifecycle_stage = LifecycleStage.PROSPECTO
                account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO
                promoted_to_prospecto = True

        # 3. Tarea de seguimiento automático
        followup_date = datetime.utcnow() + timedelta(days=next_followup_days)
        task = Task(
            account_id=account.id,
            assigned_to_id=account.owner_id or current_user.id,
            title=f"Seguimiento post-dictado: {account.company_name}",
            due_date=followup_date,
            priority=TaskPriority.NORMAL,
            origin=TaskOrigin.STATE_MACHINE,
            is_completed=False,
            created_at=datetime.utcnow(),
        )
        db.add(task)
        db.flush()
        task_id = task.id

        account.last_activity_at = datetime.utcnow()
        db.commit()

    return VoiceToCRMResponse(
        account_id=account.id if account else None,
        company_name=company_name,
        summary=summary,
        interaction_type=interaction_type_str,
        detected_amount=detected_amount,
        detected_close_date=detected_close_date,
        next_followup_days=next_followup_days,
        promoted_to_potencial=promoted_to_potencial,
        promoted_to_prospecto=promoted_to_prospecto,
        opportunity_created=opp_created,
        opportunity_title=opp_title,
        task_id=task_id,
        interaction_id=interaction_id,
    )


# Caso c: Detector de Intención de Correo (Inbox Sync)
@router.post("/email-intent", response_model=EmailIntentResponse)
def detect_email_intent(
    payload: EmailIntentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Caso c: Analiza correos entrantes/salientes, infiere intención (Tarifas, Reunión, Descarte...)
    y sugiere tipo de actividad y plazo de seguimiento.
    """
    ai = _check_ai_active(db)
    result = ai.detect_email_intent(email_body=payload.email_body)
    return EmailIntentResponse(**result)


# Caso d: Predictor de Fuga & Churn ERP
@router.get("/churn-risks", response_model=List[ChurnRiskItem])
def get_churn_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Caso d: Cruza el historial de pedidos en ERP Cache.
    Detecta clientes e identidades de facturación que superan 2x su intervalo habitual de recompra.
    """
    ai = _check_ai_active(db)
    now = datetime.utcnow()

    # Buscamos cuentas que tengan pedidos ERP
    accounts = (
        db.query(Account)
        .filter(
            (Account.lifecycle_stage == LifecycleStage.CLIENTE)
            | (Account.erp_customer_id.isnot(None))
        )
        .all()
    )

    risk_items: List[ChurnRiskItem] = []

    for acc in accounts:
        orders = (
            db.query(ErpOrderCache)
            .filter(
                (ErpOrderCache.account_id == acc.id)
                | (ErpOrderCache.billing_account_id == acc.id)
            )
            .order_by(ErpOrderCache.order_date.asc())
            .all()
        )

        if not orders:
            continue

        total_orders = len(orders)
        total_revenue = sum(o.total_amount for o in orders)
        last_order = orders[-1]
        days_since_last = max(0, (now - last_order.order_date).days)

        # Cálculo de intervalo habitual
        if total_orders >= 2:
            intervals = []
            for i in range(1, total_orders):
                diff = (orders[i].order_date - orders[i - 1].order_date).days
                if diff > 0:
                    intervals.append(diff)
            avg_interval = (sum(intervals) / len(intervals)) if intervals else 30.0
            avg_interval = max(5.0, avg_interval)
        else:
            avg_interval = 30.0

        multiplier = round(days_since_last / avg_interval, 2)

        # Regla de detección de alerta: > 1.5x intervalo o > 45 días sin comprar
        if days_since_last >= 30 and multiplier >= 1.5:
            pred = ai.predict_churn_risk(
                company_name=acc.company_name,
                client_type=acc.client_type.value if acc.client_type else None,
                total_orders=total_orders,
                days_since_last=days_since_last,
                avg_interval=avg_interval,
                multiplier=multiplier,
            )

            risk_items.append(
                ChurnRiskItem(
                    account_id=acc.id,
                    company_name=acc.company_name,
                    client_type=acc.client_type.value if acc.client_type else None,
                    tax_id=acc.tax_id,
                    total_orders_count=total_orders,
                    total_revenue_ytd=round(total_revenue, 2),
                    last_order_date=last_order.order_date.strftime("%Y-%m-%d"),
                    days_since_last_order=days_since_last,
                    avg_order_interval_days=round(avg_interval, 1),
                    churn_multiplier=multiplier,
                    risk_level=pred.get("risk_level", "MEDIO"),
                    suggested_reactivation_subject=pred.get("suggested_reactivation_subject", ""),
                    suggested_reactivation_message=pred.get("suggested_reactivation_message", ""),
                )
            )

    # Ordenar de mayor a menor riesgo (multiplicador)
    risk_items.sort(key=lambda x: x.churn_multiplier, reverse=True)
    return risk_items


@router.post("/churn-alert-task")
def create_churn_alert_task(
    payload: ChurnAlertTaskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crea una tarea prioritaria de CHURN_ALERT asignada al gestor comercial de la cuenta
    con el mensaje y propuesta de reactivación pre-redactados.
    """
    account = db.query(Account).filter(Account.id == payload.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")

    assigned_user_id = account.owner_id or current_user.id
    task = Task(
        account_id=account.id,
        assigned_to_id=assigned_user_id,
        title=f"[CHURN ALERT] Reactivación urgente: {account.company_name}",
        due_date=datetime.utcnow() + timedelta(days=2),
        priority=TaskPriority.CHURN_ALERT,
        origin=TaskOrigin.ERP_ALERT,
        is_completed=False,
        created_at=datetime.utcnow(),
    )
    db.add(task)

    # Registrar también nota de alerta en el historial
    note = Interaction(
        account_id=account.id,
        user_id=current_user.id,
        type=InteractionType.NOTE,
        summary=f"Alerta predictiva de fuga ERP activada. Mensaje sugerido:\n\n{payload.message}",
        created_at=datetime.utcnow(),
    )
    db.add(note)
    account.last_activity_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return {
        "success": True,
        "task_id": task.id,
        "message": f"Tarea prioritaria CHURN_ALERT creada para el gestor de {account.company_name}.",
    }


# Caso e: Generador de Copys de Mailing con IA
@router.post("/generate-campaign-copy", response_model=MailingCopyGenResponse)
def generate_campaign_copy(
    payload: MailingCopyGenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Caso e: Genera copys persuasivos de email marketing en HTML con variables {{nombre}} y {{empresa}}.
    Sugiere asunto, texto de previsualización y segmento adecuado.
    """
    ai = _check_ai_active(db)
    result = ai.generate_campaign_copy(
        prompt=payload.prompt,
        tone=payload.tone,
        target_stage=payload.target_stage,
    )
    return MailingCopyGenResponse(**result)
