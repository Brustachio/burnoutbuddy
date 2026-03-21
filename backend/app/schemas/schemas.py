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

# --- POMODORO SESSIONS ---
class PomodoroSessionCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    session_type: str  # e.g., 'focus' or 'break'
    perceived_difficulty: Optional[int] = None

class PomodoroSessionResponse(PomodoroSessionCreate):
    id: int
    user_id: str

    class Config:
        from_attributes = True