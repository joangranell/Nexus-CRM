from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.models.accounts import Account, LifecycleStage, SubStatus
from app.models.interactions import Interaction, InteractionType
from app.models.opportunities import Opportunity, OpportunityStatus
from app.models.tasks import Task, TaskPriority, TaskOrigin
from app.models.users import User
from app.schemas.interactions import InteractionCreate


EFFECTIVE_INTERACTION_TYPES = {
    InteractionType.CALL_EFFECTIVE,
    InteractionType.EMAIL_1TO1,
    InteractionType.MEETING_VISIT,
    InteractionType.INBOUND_REPLY,
}


def process_interaction(
    db: Session,
    account: Account,
    user: User,
    data: InteractionCreate,
) -> Tuple[Interaction, bool, bool, Optional[Task], Optional[Opportunity]]:
    """
    Core State Machine execution on recording an interaction.
    Enforces business transition rules:
    - LEAD + CALL_NO_ANSWER -> Remains LEAD, increments INTENTO_1 / INTENTO_2.
    - LEAD + EFFECTIVE CONTACT -> Promotes to PROSPECTO, assigns owner, schedules follow-up task.
    - PROSPECTO + Quantified Opportunity (amount > 0 and expected_close_date) -> Promotes to POTENCIAL.
    - Updates last_activity_at.
    """
    now = datetime.utcnow()
    promoted_to_prospecto = False
    promoted_to_potencial = False
    created_task = None
    created_opportunity = None

    # 1. Create interaction record
    interaction = Interaction(
        account_id=account.id,
        user_id=user.id,
        type=data.type,
        summary=data.summary,
        created_at=now,
    )
    db.add(interaction)

    # 2. State Machine Transitions
    if account.lifecycle_stage == LifecycleStage.LEAD:
        if data.type == InteractionType.CALL_NO_ANSWER:
            if account.sub_status == SubStatus.SIN_CONTACTAR:
                account.sub_status = SubStatus.INTENTO_1
            elif account.sub_status == SubStatus.INTENTO_1:
                account.sub_status = SubStatus.INTENTO_2
            # Remains in LEAD
        elif data.type in EFFECTIVE_INTERACTION_TYPES:
            # Transition LEAD -> PROSPECTO
            account.lifecycle_stage = LifecycleStage.PROSPECTO
            account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO
            promoted_to_prospecto = True

            # Assign to current commercial if unassigned
            if account.owner_id is None:
                account.owner_id = user.id

            # Create or schedule next follow-up task
            due_date = data.next_followup_date or (now + timedelta(days=7))
            task_title = data.followup_task_title or f"Seguimiento cualificación con {account.company_name}"
            created_task = Task(
                account_id=account.id,
                assigned_to_id=user.id,
                title=task_title,
                due_date=due_date,
                priority=TaskPriority.NORMAL,
                origin=TaskOrigin.STATE_MACHINE,
                is_completed=False,
                created_at=now,
            )
            db.add(created_task)

    elif account.lifecycle_stage == LifecycleStage.PROSPECTO:
        if data.type in EFFECTIVE_INTERACTION_TYPES:
            account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO

        if data.next_followup_date:
            task_title = data.followup_task_title or f"Seguimiento comercial con {account.company_name}"
            created_task = Task(
                account_id=account.id,
                assigned_to_id=user.id,
                title=task_title,
                due_date=data.next_followup_date,
                priority=TaskPriority.NORMAL,
                origin=TaskOrigin.MANUAL,
                is_completed=False,
                created_at=now,
            )
            db.add(created_task)

    elif account.lifecycle_stage == LifecycleStage.POTENCIAL:
        if data.type in EFFECTIVE_INTERACTION_TYPES:
            account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO

        # If a follow-up date was explicitly provided, create task
        if data.next_followup_date:
            task_title = data.followup_task_title or f"Seguimiento con {account.company_name}"
            created_task = Task(
                account_id=account.id,
                assigned_to_id=user.id,
                title=task_title,
                due_date=data.next_followup_date,
                priority=TaskPriority.NORMAL,
                origin=TaskOrigin.MANUAL,
                is_completed=False,
                created_at=now,
            )
            db.add(created_task)

    # 3. Create opportunity if requested
    if data.create_opportunity and data.opportunity_title:
        close_date = data.opportunity_close_date or (now + timedelta(days=30))
        created_opportunity = Opportunity(
            account_id=account.id,
            owner_id=user.id,
            title=data.opportunity_title,
            detected_need=data.opportunity_need or data.summary,
            estimated_amount=data.opportunity_amount or 0.0,
            status=OpportunityStatus.ABIERTA,
            expected_close_date=close_date,
            created_at=now,
        )
        db.add(created_opportunity)

        # Forecasting Rule: PROSPECTO moves to POTENCIAL when an active negotiation with amount > 0 is created
        if account.lifecycle_stage in (LifecycleStage.LEAD, LifecycleStage.PROSPECTO) and (data.opportunity_amount or 0) > 0:
            account.lifecycle_stage = LifecycleStage.POTENCIAL
            account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO
            promoted_to_potencial = True
            if account.owner_id is None:
                account.owner_id = user.id

    # Update account timestamp
    account.last_activity_at = now
    db.commit()
    db.refresh(interaction)
    if created_task:
        db.refresh(created_task)
    if created_opportunity:
        db.refresh(created_opportunity)
    db.refresh(account)

    return interaction, promoted_to_prospecto, promoted_to_potencial, created_task, created_opportunity


def recycle_stale_potentials(db: Session, days: int = 60) -> list[Account]:
    """
    Recycles PROSPECTOS and POTENCIALES without orders whose last_activity_at is older than `days`
    back into the common pool (LEAD, SIN_CONTACTAR, owner_id=None).
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    stale_accounts = (
        db.query(Account)
        .filter(
            Account.lifecycle_stage.in_([LifecycleStage.PROSPECTO, LifecycleStage.POTENCIAL]),
            Account.first_order_date.is_(None),
            Account.last_activity_at < cutoff,
        )
        .all()
    )

    recycled = []
    for acc in stale_accounts:
        old_stage = acc.lifecycle_stage.value
        acc.lifecycle_stage = LifecycleStage.LEAD
        acc.sub_status = SubStatus.SIN_CONTACTAR
        previous_owner_id = acc.owner_id
        acc.owner_id = None
        acc.last_activity_at = datetime.utcnow()

        # Log system recycling note
        note = Interaction(
            account_id=acc.id,
            user_id=previous_owner_id or 1,
            type=InteractionType.NOTE,
            summary=f"Reciclado automático desde {old_stage} a Bolsa Común de Leads tras {days} días sin actividad comercial.",
            created_at=datetime.utcnow(),
        )
        db.add(note)
        recycled.append(acc)

    if recycled:
        db.commit()
        for acc in recycled:
            db.refresh(acc)

    return recycled

