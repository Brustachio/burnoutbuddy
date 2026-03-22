from sqlalchemy import delete, select, and_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Header
from datetime import datetime, timezone, timedelta
import asyncio
import httpx

from app.utils.logger import setup_logger

logger = setup_logger(__name__)

from app.db.database import get_db
from app.models.models import DailyCheckin, PomodoroSession, Event, Task, User
from app.schemas.schemas import (
    DailyCheckinCreate,
    DailyCheckinResponse,
    PomodoroSessionCreate,
    PomodoroSessionResponse,
    RiskScoreResponse,
    AIPlanResponse,
    CalendarEventsResponse,
    UserResponse,
)

router = APIRouter()
_calendar_sync_locks: dict[str, asyncio.Lock] = {}


def get_calendar_sync_lock(user_id: str) -> asyncio.Lock:
    lock = _calendar_sync_locks.get(user_id)
    if lock is None:
        lock = asyncio.Lock()
        _calendar_sync_locks[user_id] = lock
    return lock


async def get_google_identity(
    x_google_access_token: str = Header(None, alias="X-Google-Access-Token"),
) -> dict:
    if not x_google_access_token:
        raise HTTPException(status_code=401, detail="Missing Google access token.")

    async with httpx.AsyncClient() as client:
        profile_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {x_google_access_token}"},
        )

    if profile_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google access token.")

    profile = profile_resp.json()
    user_id = profile.get("sub")
    email = profile.get("email")

    if not user_id or not email:
        raise HTTPException(status_code=400, detail="Google profile missing required fields.")

    return {
        "id": user_id,
        "email": email,
        "full_name": profile.get("name"),
    }


async def upsert_user_from_google_identity(db: AsyncSession, identity: dict) -> User:
    user = await db.get(User, identity["id"])

    if user is None:
        user = User(
            id=identity["id"],
            email=identity["email"],
            full_name=identity.get("full_name"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    user.email = identity["email"]
    user.full_name = identity.get("full_name")
    await db.commit()
    await db.refresh(user)
    return user


async def get_current_user(
    identity: dict = Depends(get_google_identity),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await upsert_user_from_google_identity(db, identity)


@router.post("/auth/google/login", response_model=UserResponse)
async def login_with_google(
    user: User = Depends(get_current_user),
):
    return user


class GeneratedTask(BaseModel):
    title: str = Field(description="Short, actionable task title")
    priority: int = Field(description="1 = high, 2 = medium, 3 = low")

class TaskList(BaseModel):
    tasks: list[GeneratedTask]

#AI PARSER VERY IMPORTANT DO NOT DELETE
@router.post("/ai/parse-calendar-tasks")
async def parse_calendar_tasks(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    events = payload.get("events", [])
    if not events:
        return {"tasks": []}

    events_text = "\n".join([
        f"- {e.get('title') or e.get('summary', 'Untitled')} (Start: {e.get('start') or e.get('start_time', '')})"
        for e in events
    ])

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.2)
    llm_structured = llm.with_structured_output(TaskList)

    try:
        result = llm_structured.invoke(f"""
        Given these calendar events, generate tasks to prepare for them.
        Priority: 1=high (exams/deadlines), 2=medium (classes/meetings), 3=low.

        Events:
        {events_text}
        """)
        return {"tasks": [{"title": t.title, "priority": t.priority} for t in result.tasks]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_google_event(raw: dict) -> dict:
    start = raw.get("start", {})
    end = raw.get("end", {})
    return {
        "id": raw.get("id", ""),
        "title": raw.get("summary", "Untitled"),
        "start": start.get("dateTime") or start.get("date", ""),
        "end": end.get("dateTime") or end.get("date", ""),
        "description": raw.get("description"),
        "location": raw.get("location"),
        "source": "google",
    }


@router.get("/calendar/google/events", response_model=CalendarEventsResponse)
async def get_google_calendar_events(
    x_google_access_token: str = Header(None, alias="X-Google-Access-Token"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lock = get_calendar_sync_lock(user.id)
    async with lock:
        async with httpx.AsyncClient() as client:
            cal_list_resp = await client.get(
                "https://www.googleapis.com/calendar/v3/users/me/calendarList",
                headers={"Authorization": f"Bearer {x_google_access_token}"},
            )
            if cal_list_resp.status_code != 200:
                raise HTTPException(status_code=cal_list_resp.status_code, detail="Failed to list calendars.")

            calendar_ids = [c["id"] for c in cal_list_resp.json().get("items", [])]
            if not calendar_ids:
                calendar_ids = ["primary"]

            now_utc = datetime.now(timezone.utc)
            seven_days_utc = now_utc + timedelta(days=7)
            now_str = now_utc.isoformat().replace("+00:00", "Z")
            max_str = seven_days_utc.isoformat().replace("+00:00", "Z")

            raw_all: list[dict] = []
            for cal_id in calendar_ids:
                resp = await client.get(
                    f"https://www.googleapis.com/calendar/v3/calendars/{cal_id}/events",
                    headers={"Authorization": f"Bearer {x_google_access_token}"},
                    params={
                        "timeMin": now_str,
                        "timeMax": max_str,
                        "maxResults": 50,
                        "singleEvents": True,
                        "orderBy": "startTime",
                    },
                )
                if resp.status_code == 200:
                    raw_all.extend(resp.json().get("items", []))

        seen: set[tuple] = set()
        events: list[dict] = []
        for raw in raw_all:
            parsed = parse_google_event(raw)
            key = (parsed["id"], parsed["start"], parsed["end"], parsed["title"])
            if key not in seen:
                seen.add(key)
                events.append(parsed)

        # Collect all google_event_ids from current fetch
        current_google_event_ids = {e["id"] for e in events if e["id"]}
        
        # Delete events that were in the database but are no longer in Google Calendar
        delete_stmt = delete(Event).where(
            and_(
                Event.user_id == user.id,
                Event.source == "google",
                ~Event.google_event_id.in_(current_google_event_ids)
            )
        )
        await db.execute(delete_stmt)

        for e in events:
            try:
                start_dt = datetime.fromisoformat(e["start"].replace("Z", "+00:00")).replace(tzinfo=None)
                end_dt = datetime.fromisoformat(e["end"].replace("Z", "+00:00")).replace(tzinfo=None)
                
                # Upsert: insert if new, update if exists (identified by user_id + google_event_id + source)
                stmt = pg_insert(Event).values(
                    user_id=user.id,
                    google_event_id=e["id"],
                    title=e["title"],
                    start_time=start_dt,
                    end_time=end_dt,
                    source="google",
                    workload_weight=3,
                    course=e.get("description", "")[:50] if e.get("description") else "",
                ).on_conflict_do_update(
                    index_elements=['user_id', 'google_event_id', 'source'],
                    set_=dict(
                        title=e["title"],
                        start_time=start_dt,
                        end_time=end_dt,
                        workload_weight=3,
                        course=e.get("description", "")[:50] if e.get("description") else "",
                    )
                )
                await db.execute(stmt)
            except Exception as ex:
                logger.error(f"Error upserting event {e.get('id')}: {str(ex)}")
                continue

        await db.commit()
        return {"events": events}

 
# ---------------------------------------------------------------------------
# Check-ins
# ---------------------------------------------------------------------------
 
@router.post("/checkins", response_model=DailyCheckinResponse)
async def create_checkin(
    checkin: DailyCheckinCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_checkin = DailyCheckin(
        **checkin.model_dump(),
        user_id=user.id,
        date=datetime.now(),
    )
    db.add(db_checkin)
    await db.commit()
    await db.refresh(db_checkin)
    return db_checkin
 
 
# ---------------------------------------------------------------------------
# Pomodoro sessions
# ---------------------------------------------------------------------------
 
@router.post("/sessions", response_model=PomodoroSessionResponse)
async def create_session(
    session: PomodoroSessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_session = PomodoroSession(
        **session.model_dump(),
        user_id=user.id,
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session
 
 
# ---------------------------------------------------------------------------
# Risk score
# ---------------------------------------------------------------------------
 
@router.get("/risk-score", response_model=RiskScoreResponse)
async def get_risk_score(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    three_days_ago = datetime.now() - timedelta(days=3)
 
    checkins_stmt = select(DailyCheckin).where(
        and_(DailyCheckin.user_id == user.id, DailyCheckin.date >= three_days_ago)
    )
    checkins_result = await db.execute(checkins_stmt)
    recent_checkins = checkins_result.scalars().all()
 
    seven_days_ahead = datetime.now() + timedelta(days=7)
    events_stmt = select(Event).where(
        and_(
            Event.user_id == user.id,
            Event.start_time >= datetime.now(),
            Event.start_time <= seven_days_ahead,
        )
    )
    events_result = await db.execute(events_stmt)
    upcoming_events = events_result.scalars().all()
 
    avg_stress = sum(c.stress_level for c in recent_checkins) / len(recent_checkins) if recent_checkins else 0
    avg_sleep = sum(c.sleep_hours for c in recent_checkins) / len(recent_checkins) if recent_checkins else 8
    event_density = len(upcoming_events)
 
    if avg_stress >= 8 or (avg_sleep < 5 and event_density >= 4):
        risk_level = "High"
    elif avg_stress >= 5 or event_density >= 3:
        risk_level = "Med"
    else:
        risk_level = "Low"
 
    return RiskScoreResponse(
        risk_level=risk_level,
        details=f"Calculated using {len(recent_checkins)} recent check-ins and {event_density} upcoming events.",
    )
 