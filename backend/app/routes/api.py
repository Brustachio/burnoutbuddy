from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.models import DailyCheckin, PomodoroSession, Event, Task
from app.schemas.schemas import (
    DailyCheckinCreate, 
    DailyCheckinResponse, 
    PomodoroSessionCreate, 
    PomodoroSessionResponse,
    RiskScoreResponse,
    AIPlanResponse
)

router = APIRouter()

# POST /checkins endpoint
@router.post("/checkins", response_model=DailyCheckinResponse)
async def create_checkin(
    checkin: DailyCheckinCreate, 
    user_id: str = "test-user-id", 
    db: AsyncSession = Depends(get_db)
):
    db_checkin = DailyCheckin(
        **checkin.model_dump(), 
        user_id=user_id, 
        date=datetime.now()
    )
    db.add(db_checkin)
    await db.commit()
    await db.refresh(db_checkin)
    return db_checkin

# POST /sessions endpoint
@router.post("/sessions", response_model=PomodoroSessionResponse)
async def create_session(
    session: PomodoroSessionCreate, 
    user_id: str = "test-user-id", 
    db: AsyncSession = Depends(get_db)
):
    db_session = PomodoroSession(
        **session.model_dump(), 
        user_id=user_id
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session

# GET /risk-score endpoint
@router.get("/risk-score", response_model=RiskScoreResponse)
async def get_risk_score(
    user_id: str = "test-user-id", 
    db: AsyncSession = Depends(get_db)
):
    three_days_ago = datetime.now() - timedelta(days=3)
    
    # 1. Fetch last 3 days of check-ins
    checkins_stmt = select(DailyCheckin).where(
        and_(DailyCheckin.user_id == user_id, DailyCheckin.date >= three_days_ago)
    )
    checkins_result = await db.execute(checkins_stmt)
    recent_checkins = checkins_result.scalars().all()

    # 2. Fetch upcoming events (next 7 days for deadline density)
    seven_days_ahead = datetime.now() + timedelta(days=7)
    events_stmt = select(Event).where(
        and_(
            Event.user_id == user_id, 
            Event.start_time >= datetime.now(), 
            Event.start_time <= seven_days_ahead
        )
    )
    events_result = await db.execute(events_stmt)
    upcoming_events = events_result.scalars().all()

    # 3. Calculate Risk Engine Logic
    avg_stress = sum(c.stress_level for c in recent_checkins) / len(recent_checkins) if recent_checkins else 0
    avg_sleep = sum(c.sleep_hours for c in recent_checkins) / len(recent_checkins) if recent_checkins else 8
    event_density = len(upcoming_events)

    # Hackathon-level heuristic for burnout
    if avg_stress >= 8 or (avg_sleep < 5 and event_density >= 4):
        risk_level = "High"
    elif avg_stress >= 5 or event_density >= 3:
        risk_level = "Med"
    else:
        risk_level = "Low"

    return RiskScoreResponse(
        risk_level=risk_level, 
        details=f"Calculated using {len(recent_checkins)} recent check-ins and {event_density} upcoming events."
    )

# POST /ai/plan-week endpoint
@router.post("/ai/plan-week", response_model=AIPlanResponse)
async def generate_ai_plan(
    user_id: str = "test-user-id", 
    db: AsyncSession = Depends(get_db)
):
    """
    Placeholder for LangChain Integration.
    Next step: Fetch Events from DB -> Send to OpenAI via LangChain -> Parse JSON into `Task` models -> Save to DB.
    """
    return AIPlanResponse(
        message="LangChain endpoint primed. Ready to wire up OpenAI.",
        tasks_generated=0
    )
