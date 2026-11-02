from datetime import datetime, date, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.tasks import Task, TaskPriority, TaskOrigin
from app.models.accounts import Account, LifecycleStage, SubStatus
from app.models.users import User, UserRole
from app.schemas.tasks import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    MyDayResponse,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tareas y Mi Día"])


def _serialize_task(task: Task) -> dict:
    return {
        "id": task.id,
        "account_id": task.account_id,
        "account_company_name": task.account.company_name if task.account else None,
        "assigned_to_id": task.assigned_to_id,
        "assigned_to_name": task.assigned_to.name if task.assigned_to else None,
        "title": task.title,
        "due_date": task.due_date,
        "priority": task.priority,
        "is_completed": task.is_completed,
        "origin": task.origin,
        "created_at": task.created_at,
    }


@router.get("/my-day", response_model=MyDayResponse)
def get_my_day(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the commercial's personalized daily action list:
    - Urgent high-priority tasks (HIGH_INTENT, CHURN_ALERT)
    - Tasks due today
    - Overdue tasks
    - Upcoming tasks
    - Leads to contact from the common pool
    """
    now = datetime.utcnow()
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    # Base task query for user (or all if admin)
    task_query = (
        db.query(Task)
        .options(joinedload(Task.account), joinedload(Task.assigned_to))
        .filter(Task.is_completed == False)
    )

    if current_user.role not in (UserRole.ADMIN_MARKETING, UserRole.SUPER_ADMIN):
        task_query = task_query.filter(Task.assigned_to_id == current_user.id)

    all_pending = task_query.order_by(Task.due_date.asc()).all()

    urgent_tasks = []
    overdue_tasks = []
    today_tasks = []
    upcoming_tasks = []

    for t in all_pending:
        serialized = _serialize_task(t)
        if t.priority in (TaskPriority.HIGH_INTENT, TaskPriority.CHURN_ALERT):
            urgent_tasks.append(serialized)

        if t.due_date < today_start:
            overdue_tasks.append(serialized)
        elif today_start <= t.due_date <= today_end:
            today_tasks.append(serialized)
        else:
            upcoming_tasks.append(serialized)

    # Leads from Bolsa Común to prospect today
    leads_to_contact_q = (
        db.query(Account)
        .filter(
            Account.lifecycle_stage == LifecycleStage.LEAD,
            Account.owner_id.is_(None),
            Account.sub_status.in_([SubStatus.SIN_CONTACTAR, SubStatus.INTENTO_1]),
        )
        .order_by(Account.created_at.asc())
        .limit(10)
        .all()
    )

    leads_data = [
        {
            "id": l.id,
            "company_name": l.company_name,
            "contact_name": l.contact_name,
            "phone": l.phone,
            "email": l.email,
            "sub_status": l.sub_status.value,
            "source": l.source,
            "ai_summary": l.ai_summary,
            "created_at": l.created_at.isoformat(),
        }
        for l in leads_to_contact_q
    ]

    return {
        "urgent_tasks": urgent_tasks,
        "today_tasks": today_tasks,
        "overdue_tasks": overdue_tasks,
        "upcoming_tasks": upcoming_tasks,
        "leads_to_contact": leads_data,
        "stats": {
            "total_pending": len(all_pending),
            "urgent_count": len(urgent_tasks),
            "today_count": len(today_tasks),
            "overdue_count": len(overdue_tasks),
            "leads_pool_count": len(leads_data),
        },
    }


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    account_id: Optional[int] = None,
    is_completed: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists tasks with optional filters."""
    query = db.query(Task).options(joinedload(Task.account), joinedload(Task.assigned_to))

    if account_id:
        query = query.filter(Task.account_id == account_id)
    if is_completed is not None:
        query = query.filter(Task.is_completed == is_completed)
    if current_user.role not in (UserRole.ADMIN_MARKETING, UserRole.SUPER_ADMIN):
        query = query.filter(Task.assigned_to_id == current_user.id)

    tasks = query.order_by(Task.due_date.asc()).all()
    return [_serialize_task(t) for t in tasks]


@router.post("", response_model=TaskResponse)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new task."""
    task = Task(
        account_id=payload.account_id,
        assigned_to_id=payload.assigned_to_id or current_user.id,
        title=payload.title,
        due_date=payload.due_date,
        priority=payload.priority,
        origin=payload.origin,
        is_completed=False,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.patch("/{task_id}/toggle", response_model=TaskResponse)
def toggle_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggles task completion status."""
    task = db.query(Task).options(joinedload(Task.account), joinedload(Task.assigned_to)).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    task.is_completed = not task.is_completed
    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates task fields (title, due_date, priority, is_completed)."""
    task = (
        db.query(Task)
        .options(joinedload(Task.account), joinedload(Task.assigned_to))
        .filter(Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    if current_user.role not in (UserRole.ADMIN_MARKETING, UserRole.SUPER_ADMIN) and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar esta tarea")

    if payload.title is not None:
        task.title = payload.title.strip()
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.is_completed is not None:
        task.is_completed = payload.is_completed

    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    if current_user.role not in (UserRole.ADMIN_MARKETING, UserRole.SUPER_ADMIN) and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar esta tarea")

    db.delete(task)
    db.commit()
    return {"message": "Tarea eliminada correctamente", "id": task_id}
