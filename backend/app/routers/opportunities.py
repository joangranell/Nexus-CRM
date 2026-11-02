from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.opportunities import Opportunity, OpportunityStatus
from app.models.accounts import Account
from app.models.users import User
from app.schemas.opportunities import (
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/opportunities", tags=["Oportunidades"])


@router.get("", response_model=List[OpportunityResponse])
def list_opportunities(
    account_id: Optional[int] = None,
    status: Optional[OpportunityStatus] = None,
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists opportunities with optional filters."""
    query = db.query(Opportunity)
    if account_id:
        query = query.filter(Opportunity.account_id == account_id)
    if status:
        query = query.filter(Opportunity.status == status)
    if owner_id:
        query = query.filter(Opportunity.owner_id == owner_id)

    return query.order_by(Opportunity.created_at.desc()).all()


@router.post("", response_model=OpportunityResponse)
def create_opportunity(
    payload: OpportunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new negotiation / deal linked to an account."""
    account = db.query(Account).filter(Account.id == payload.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    opp = Opportunity(
        account_id=payload.account_id,
        owner_id=current_user.id,
        title=payload.title,
        detected_need=payload.detected_need,
        estimated_amount=payload.estimated_amount,
        status=payload.status,
        expected_close_date=payload.expected_close_date,
    )
    db.add(opp)

    # State Machine Transition: PROSPECTO -> POTENCIAL when an opportunity with amount > 0 and expected_close_date is registered
    from datetime import datetime
    from app.models.accounts import LifecycleStage, SubStatus
    if account.lifecycle_stage in (LifecycleStage.LEAD, LifecycleStage.PROSPECTO):
        if (opp.estimated_amount or 0) > 0 and opp.expected_close_date:
            account.lifecycle_stage = LifecycleStage.POTENCIAL
            account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO
            account.last_activity_at = datetime.utcnow()
            if account.owner_id is None:
                account.owner_id = current_user.id

    db.commit()
    db.refresh(opp)
    return opp


@router.put("/{opportunity_id}", response_model=OpportunityResponse)
def update_opportunity(
    opportunity_id: int,
    payload: OpportunityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates opportunity details or status (ABIERTA, GANADA, PERDIDA)."""
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(opp, k, v)

    db.commit()
    db.refresh(opp)
    return opp
