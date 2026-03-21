from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# --- USERS ---
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    id: str  # Coming from Supabase Auth UUID

class UserResponse(UserBase):
    id: str
    class Config:
        from_attributes = True

# --- DAILY CHECK-INS ---
class DailyCheckinCreate(BaseModel):
    mood: int
    sleep_hours: float
    stress_level: int
    workload_rating: int
    notes: Optional[str] = None

class DailyCheckinResponse(DailyCheckinCreate):
    id: int
    user_id: str
    date: datetime
    class Config:
        from_attributes = True

# --- TASKS ---
class TaskCreate(BaseModel):
    title: str
    course: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str
    estimated_pomodoros: int

class TaskResponse(TaskCreate):
    id: int
    user_id: str
    is_completed: int
    class Config:
        from_attributes = True

# --- POMODORO SESSIONS ---
class PomodoroSessionCreate(BaseModel):
    task_id: Optional[int] = None  # Added task_id foreign key
    start_time: datetime
    end_time: datetime
    session_type: str  # e.g., 'focus' or 'break'
    perceived_difficulty: Optional[int] = None

class PomodoroSessionResponse(PomodoroSessionCreate):
    id: int
    user_id: str
    class Config:
        from_attributes = True


class PomodoroSessionStatsResponse(BaseModel):
    total_sessions: int
    total_focus_sessions: int
    total_break_sessions: int

# --- RISK & AI ---
class RiskScoreResponse(BaseModel):
    risk_level: str  # "Low", "Med", "High"
    details: str

class AIPlanResponse(BaseModel):
    message: str
    tasks_generated: int

class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str
    end: str
    description: Optional[str] = None
    location: Optional[str] = None
    source: str = "google"

class CalendarEventsResponse(BaseModel):
    events: list[CalendarEvent]