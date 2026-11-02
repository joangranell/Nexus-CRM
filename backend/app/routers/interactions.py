from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.accounts import Account, LifecycleStage
from app.models.interactions import Interaction
from app.models.users import User
from app.schemas.interactions import InteractionCreate, InteractionResponse
from app.schemas.tasks import TaskResponse
from app.schemas.opportunities import OpportunityResponse
from app.services.auth import get_current_user
from app.services.state_machine import process_interaction

router = APIRouter(prefix="/accounts/{account_id}/interactions", tags=["Interacciones"])


class InteractionProcessResult(BaseModel):
    interaction: InteractionResponse
    promoted_to_prospecto: bool = False
    promoted_to_potencial: bool = False
    new_lifecycle_stage: LifecycleStage
    new_sub_status: str
    assigned_owner_id: Optional[int] = None
    created_task: Optional[TaskResponse] = None
    created_opportunity: Optional[OpportunityResponse] = None
    message: str


@router.post("", response_model=InteractionProcessResult)
def add_interaction(
    account_id: int,
    payload: InteractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registers an interaction on an account and executes the state machine:
    - If account is in LEAD and contact is effective (call, meeting, email 1-to-1):
      promotes account automatically to PROSPECTO, assigns commercial owner and schedules follow-up task.
    - If opportunity with amount > 0 is created, promotes to POTENCIAL.
    - If CALL_NO_ANSWER: increments sub_status INTENTO_1 / INTENTO_2.
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    old_stage = account.lifecycle_stage
    interaction, promoted_prospect, promoted_potencial, task, opp = process_interaction(
        db=db,
        account=account,
        user=current_user,
        data=payload,
    )

    msg = "Interacción registrada correctamente"
    if promoted_potencial:
        msg = f"¡Excelente! La cuenta '{account.company_name}' cuenta con negociación activa cuantificada y ha sido promovida a POTENCIAL."
    elif promoted_prospect:
        msg = f"¡Excelente! La cuenta '{account.company_name}' ha sido cualificada y promovida automáticamente a PROSPECTO."

    return {
        "interaction": {
            "id": interaction.id,
            "account_id": interaction.account_id,
            "user_id": interaction.user_id,
            "user_name": current_user.name,
            "type": interaction.type,
            "summary": interaction.summary,
            "created_at": interaction.created_at,
        },
        "promoted_to_prospecto": promoted_prospect,
        "promoted_to_potencial": promoted_potencial,
        "new_lifecycle_stage": account.lifecycle_stage,
        "new_sub_status": account.sub_status.value,
        "assigned_owner_id": account.owner_id,
        "created_task": {
            "id": task.id,
            "account_id": task.account_id,
            "account_company_name": account.company_name,
            "assigned_to_id": task.assigned_to_id,
            "assigned_to_name": current_user.name,
            "title": task.title,
            "due_date": task.due_date,
            "priority": task.priority,
            "is_completed": task.is_completed,
            "origin": task.origin,
            "created_at": task.created_at,
        } if task else None,
        "created_opportunity": {
            "id": opp.id,
            "account_id": opp.account_id,
            "owner_id": opp.owner_id,
            "title": opp.title,
            "detected_need": opp.detected_need,
            "estimated_amount": opp.estimated_amount,
            "status": opp.status,
            "expected_close_date": opp.expected_close_date,
            "created_at": opp.created_at,
        } if opp else None,
        "message": msg,
    }


@router.get("", response_model=List[InteractionResponse])
def get_interactions(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists interaction history for an account."""
    interactions = (
        db.query(Interaction)
        .options(joinedload(Interaction.user))
        .filter(Interaction.account_id == account_id)
        .order_by(Interaction.created_at.desc())
        .all()
    )
    return [
        {
            "id": i.id,
            "account_id": i.account_id,
            "user_id": i.user_id,
            "user_name": i.user.name if i.user else "Sistema",
            "type": i.type,
            "summary": i.summary,
            "created_at": i.created_at,
        }
        for i in interactions
    ]
