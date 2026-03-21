from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, UniqueConstraint
from app.db import Base

class User(Base):
    __tablename__ = "users"
    
    # Supabase uses UUID strings for Auth, so we use String here
    id = Column(String, primary_key=True, index=True) 
    email = Column(String, unique=True, index=True)
    full_name = Column(String)

class DailyCheckin(Base):
    __tablename__ = "daily_checkins"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    date = Column(DateTime)
    mood = Column(Integer)
    sleep_hours = Column(Float)
    stress_level = Column(Integer)
    workload_rating = Column(Integer)
    notes = Column(Text)

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    google_event_id = Column(String, nullable=True, index=True)  # Google Calendar event ID
    title = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    source = Column(String)
    workload_weight = Column(Integer)
    course = Column(String)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'google_event_id', 'source', name='uq_user_google_event_source'),
    )

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    course = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String) # e.g., 'Low', 'Med', 'High'
    estimated_pomodoros = Column(Integer)
    is_completed = Column(Integer, default=0) # 0 for false, 1 for true

class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    session_type = Column(String) # 'focus' or 'break'
    perceived_difficulty = Column(Integer)