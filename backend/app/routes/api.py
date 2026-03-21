from sqlalchemy import delete, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Header
from datetime import datetime, timezone, timedelta
import httpx

from app.db.database import get_db
from app.models.models import DailyCheckin, PomodoroSession, Event, Task
from app.schemas.schemas import (
    DailyCheckinCreate,
    DailyCheckinResponse,
    PomodoroSessionCreate,
    PomodoroSessionResponse,
    RiskScoreResponse,
    AIPlanResponse,
    CalendarEventsResponse,
)

router = APIRouter()


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
    user_id: str = "test-user-id",
    db: AsyncSession = Depends(get_db),
):
    if not x_google_access_token:
        raise HTTPException(status_code=401, detail="Missing Google access token.")

    async with httpx.AsyncClient() as client:
        now_utc = datetime.now(timezone.utc)
        seven_days_utc = now_utc + timedelta(days=7)
        now_str = now_utc.isoformat().replace("+00:00", "Z")
        max_str = seven_days_utc.isoformat().replace("+00:00", "Z")
        response = await client.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {x_google_access_token}"},
            params={
                "timeMin": now_str,
                "timeMax": max_str,
                "maxResults": 50,
                "singleEvents": True,
                "orderBy": "startTime",
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Google Calendar API error.")

    raw_events = response.json().get("items", [])
    events = [parse_google_event(e) for e in raw_events]

    now_dt = datetime.now()
    delete_stmt = delete(Event).where(
        and_(Event.user_id == user_id, Event.source == "google", Event.start_time >= now_dt)
    )
    await db.execute(delete_stmt)

    for e in events:
        try:
            start_dt = datetime.fromisoformat(e["start"].replace("Z", "+00:00")).replace(tzinfo=None)
            end_dt = datetime.fromisoformat(e["end"].replace("Z", "+00:00")).replace(tzinfo=None)
            db_event = Event(
                user_id=user_id,
                title=e["title"],
                start_time=start_dt,
                end_time=end_dt,
                source="google",
                workload_weight=3,
                course=e.get("description", "")[:50] if e.get("description") else "",
            )
            db.add(db_event)
        except Exception:
            continue

    await db.commit()
    return {"events": events}


# --- LANGCHAIN AI PLANNER (GEMINI 2.5 FLASH) ---
class GeneratedTask(BaseModel):
    title: str = Field(description="Name of the specific study task")
    course: str = Field(description="Associated course name, or 'General'", default="General")
    due_date: datetime = Field(description="When this task should be completed by")
    priority: str = Field(description="Must be 'Low', 'Med', or 'High'")
    estimated_pomodoros: int = Field(description="Number of 25-minute blocks needed (integer)")


class TaskList(BaseModel):
    tasks: list[GeneratedTask]


@router.post("/ai/plan-week", response_model=AIPlanResponse)
async def generate_ai_plan(
    user_id: str = "test-user-id",
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now()
    seven_days_ahead = now + timedelta(days=7)
    events_stmt = select(Event).where(
        and_(
            Event.user_id == user_id,
            Event.start_time >= now,
            Event.start_time <= seven_days_ahead,
        )
    )
    events_result = await db.execute(events_stmt)
    upcoming_events = events_result.scalars().all()

    if not upcoming_events:
        return AIPlanResponse(message="No upcoming events found. Sync calendar first.", tasks_generated=0)

    events_text = "\n".join(
        [f"- {e.title} (Starts: {e.start_time}, Ends: {e.end_time})" for e in upcoming_events]
    )

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)
    llm_with_structured_output = llm.with_structured_output(TaskList)

    prompt = f"""
    You are an intelligent study planner designed to prevent burnout.
    The user has the following calendar events scheduled over the next 7 days:

    {events_text}

    Analyze these events. If you see exams, project deadlines, or classes, generate actionable study tasks to help the user prepare.
    Break large tasks into smaller ones. Assign 'estimated_pomodoros' (25-min study blocks) for each task.
    Do not schedule tasks during the exact times of their calendar events.
    """

    try:
        result = llm_with_structured_output.invoke(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini generation failed: {str(e)}")

    saved_tasks_count = 0
    if hasattr(result, "tasks") and result.tasks:
        for t in result.tasks:
            db_task = Task(
                user_id=user_id,
                title=t.title,
                course=t.course,
                due_date=t.due_date,
                priority=t.priority,
                estimated_pomodoros=t.estimated_pomodoros,
                is_completed=0,
            )
            db.add(db_task)
            saved_tasks_count += 1
        await db.commit()

    return AIPlanResponse(
        message=f"Successfully generated {saved_tasks_count} study tasks with Gemini!",
        tasks_generated=saved_tasks_count,
    )


# POST /checkins endpoint
@router.post("/checkins", response_model=DailyCheckinResponse)
async def create_checkin(
    checkin: DailyCheckinCreate,
    user_id: str = "test-user-id",
    db: AsyncSession = Depends(get_db),
):
    db_checkin = DailyCheckin(
        **checkin.model_dump(),
        user_id=user_id,
        date=datetime.now(),
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
    db: AsyncSession = Depends(get_db),
):
    db_session = PomodoroSession(
        **session.model_dump(),
        user_id=user_id,
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session


# GET /risk-score endpoint
@router.get("/risk-score", response_model=RiskScoreResponse)
async def get_risk_score(
    user_id: str = "test-user-id",
    db: AsyncSession = Depends(get_db),
):
    three_days_ago = datetime.now() - timedelta(days=3)

    checkins_stmt = select(DailyCheckin).where(
        and_(DailyCheckin.user_id == user_id, DailyCheckin.date >= three_days_ago)
    )
    checkins_result = await db.execute(checkins_stmt)
    recent_checkins = checkins_result.scalars().all()

    seven_days_ahead = datetime.now() + timedelta(days=7)
    events_stmt = select(Event).where(
        and_(
            Event.user_id == user_id,
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
