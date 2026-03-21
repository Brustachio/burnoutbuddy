from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

# Adjust these imports if your file names are slightly different (e.g. models.domain)
from app.db.database import get_db
from app.models.models import DailyCheckin, PomodoroSession
from app.schemas.schemas import (
    DailyCheckinCreate, 
    DailyCheckinResponse, 
    PomodoroSessionCreate, 
    PomodoroSessionResponse
)

router = APIRouter()

# POST /checkins endpoint
@router.post("/checkins", response_model=DailyCheckinResponse)
async def create_checkin(
    checkin: DailyCheckinCreate, 
    # Hardcoding user_id temporarily until frontend Google Auth is fully linked
    user_id: str = "test-user-id", 
    db: AsyncSession = Depends(get_db)
):
    # Convert the Pydantic schema into a SQLAlchemy model instance
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