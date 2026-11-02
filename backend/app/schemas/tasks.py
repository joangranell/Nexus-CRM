from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.tasks import TaskPriority, TaskOrigin


class TaskBase(BaseModel):
    title: str = Field(..., max_length=255)
    due_date: datetime
    priority: TaskPriority = TaskPriority.NORMAL
    origin: TaskOrigin = TaskOrigin.MANUAL


class TaskCreate(TaskBase):
    account_id: Optional[int] = None
    assigned_to_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    is_completed: Optional[bool] = None


class TaskResponse(TaskBase):
    id: int
    account_id: Optional[int] = None
    account_company_name: Optional[str] = None
    assigned_to_id: int
    assigned_to_name: Optional[str] = None
    is_completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyDayResponse(BaseModel):
    urgent_tasks: list[TaskResponse]
    today_tasks: list[TaskResponse]
    upcoming_tasks: list[TaskResponse]
    overdue_tasks: list[TaskResponse]
    leads_to_contact: list[dict]
    stats: dict
