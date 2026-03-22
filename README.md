# BurnoutBuddy

**Your AI-powered study companion that keeps burnout from creeping in.**

---

## 💡 The Problem

It's Sunday night. Your exam is Tuesday. You've been "studying" for hours but feel like you've absorbed nothing — and now you're too wired, too anxious, and too exhausted to actually focus. Sound familiar?

Student burnout isn't just about working too hard. It's about working *wrong* — cramming everything into the last 48 hours, skipping sleep, ignoring how you feel, and having zero visibility into what's actually on your plate. By the time you notice the warning signs, you're already running on empty.

The result: declining grades, deteriorating health, and a cycle that compounds every semester.

---

## ✨ Our Solution

BurnoutBuddy is a full-stack productivity app that fights burnout before it starts. It connects to your Google Calendar, analyzes your upcoming schedule with AI, and turns that chaos into a calm, structured study session — complete with enforced breaks, daily wellness check-ins, and a real-time burnout risk score.

You don't have to figure out what to work on or when to stop. BurnoutBuddy does that for you.

---

## 🏗️ How It Works

**1. Sign in with Google**
Land on the app and authenticate via Google OAuth. This grants BurnoutBuddy read-only access to your Google Calendar — no account creation, no passwords.

**2. AI-Powered Session Kick-Off**
The moment you hit Start, BurnoutBuddy syncs your Google Calendar events for the next 7 days. A **Gemini 2.5 Flash Lite** AI model analyzes your schedule — detecting upcoming exams, deadlines, lectures, and meetings — and generates a prioritized task list tailored to your current free windows. High-priority tasks (exams in 3 days) float to the top automatically.

**3. Work in Focused Pomodoro Cycles**
BurnoutBuddy runs a fully customizable Pomodoro timer: configurable focus durations, short breaks, long breaks, and sessions-per-cycle. A progress bar and session dots keep you anchored. Supports **Picture-in-Picture** mode so the timer floats over any other window.

**4. Manage Your Tasks in Real Time**
A collapsible, resizable task panel lives on the left side of your screen. Add tasks manually, drag to reorder, cycle through priority levels (high / med / low), and check items off as you go — all without leaving the timer.

**5. Forced Check-In After Every Cycle**
After completing a full Pomodoro cycle, the timer pauses and a **mandatory wellness check-in** appears. You rate your mood, stress level, sleep, and workload, and select how you're feeling from a set of prompts. There's no skipping it — your wellbeing is part of the workflow.

**6. Live Burnout Risk Score**
After each check-in, the backend calculates your **burnout risk level** (Low / Med / High) based on your recent check-in history and the density of upcoming calendar events. It surfaces contextual wellness recommendations from UVA's campus resources based on what you reported feeling.

**7. Emergency Support — Always One Click Away**
If things get overwhelming, a subtle "I need help right now" button at the bottom of the timer halts the session immediately and routes you to an emergency resources page with UVA CAPS, the Crisis Text Line, the 988 Lifeline, and Student Health contacts.

---

## 🔧 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.116 + Uvicorn |
| Language | Python 3.x (async throughout) |
| ORM | SQLAlchemy 2.0 (async) + asyncpg |
| Database | PostgreSQL |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| HTTP Client | httpx (async) |
| AI / LLM | LangChain + `langchain-google-genai` (Gemini 2.5 Flash Lite) |
| Auth | Google OAuth2 via token verification against Google's userinfo endpoint |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 + DaisyUI |
| Components | shadcn/ui (Radix UI primitives) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Auth / BaaS | Supabase JS (Google OAuth provider) |
| State | React Context + useReducer |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL (running locally or via Docker)
- A Supabase project with Google OAuth enabled
- A Google Cloud project with the Calendar API enabled
- A Google Gemini API key

### 1. Clone the repo

```bash
git clone https://github.com/Brustachio/burnoutbuddy.git
cd burnoutbuddy
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
APP_NAME=BurnoutBuddy
APP_VERSION=1.0.0
APP_DESCRIPTION=Student burnout prevention app

DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/burnoutbuddy
CORS_ORIGINS=["http://localhost:5173"]
ENVIRONMENT=development

GOOGLE_API_KEY=your_gemini_api_key_here
```

Run migrations and start the server:

```bash
python manage.py migrate
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

The app will be running at `http://localhost:5173`.

### 4. Supabase Google OAuth

In your Supabase dashboard, enable the Google provider under **Authentication → Providers**. Set the authorized redirect URI to `http://localhost:5173`. Ensure the Google Cloud OAuth client has `https://www.googleapis.com/auth/calendar.readonly` in its allowed scopes.

---

## 🎯 Features

### For Students
- **Google Sign-In** — one click, no passwords, instant calendar access
- **AI Task Generation** — Gemini analyzes your next 7 days and builds a prioritized task list before every session
- **Pomodoro Timer** — customizable focus / short break / long break durations with auto-cycle support
- **Picture-in-Picture** — float the timer over any window while you work
- **Task Panel** — add, prioritize, reorder (drag-and-drop), and complete tasks in real time
- **Daily Check-In** — rate mood, stress, sleep, and workload after every Pomodoro cycle
- **Burnout Risk Score** — live Low / Med / High risk assessment based on recent check-ins and calendar density
- **Wellness Recommendations** — contextual UVA campus resource suggestions based on how you're feeling
- **Emergency Page** — instant access to CAPS, Crisis Text Line, 988 Lifeline, and Student Health
- **Calendar View** — 7-day Google Calendar grid with auto-sync on page load
- **Dark / Light Mode** — system-aware theme with manual toggle

### System Features
- Async FastAPI backend with per-user Google Calendar sync locks (prevents race conditions)
- PostgreSQL upsert for calendar events — syncs cleanly without duplicates
- Burnout risk algorithm weighing average stress, average sleep, and upcoming event density
- Structured LLM output via LangChain — AI tasks are typed and validated before reaching the UI
- Session telemetry — every focus block and break is timestamped and persisted to the database
- Forced check-in gate — timer cannot resume until wellness data is submitted
- Supabase auth state listener — seamless token refresh and logout propagation

---

## 🏆 Accomplishments

- Built a complete end-to-end AI workflow: Google Calendar → LLM analysis → structured task output → live UI, all within a single session start
- Implemented a clinically-informed burnout risk model that factors in recency-weighted stress, sleep deficit, and forward-looking schedule density
- Designed a "forced check-in" UX pattern that makes wellness data collection feel like a natural part of the workflow rather than an interruption
- Shipped Picture-in-Picture timer support using the browser's native Document PiP API with a full React portal
- Handled multi-calendar Google sync with per-user async locks and idempotent upserts across all of a user's calendars simultaneously

---

## 📚 What We Learned

- **LangChain structured output** (`with_structured_output`) paired with Pydantic models is significantly more reliable than prompt-engineering JSON from a raw LLM — it eliminated an entire class of parsing bugs
- **Supabase OAuth + FastAPI** requires careful token handoff: Supabase issues the Google provider token client-side, which must then be forwarded to the backend as a header for server-side identity verification
- The **forced check-in pattern** taught us that friction can be a feature — making wellness data collection mandatory rather than optional was the only way to gather enough signal to make the risk model meaningful
- **Async SQLAlchemy** with PostgreSQL and per-user locks made calendar sync safe under concurrent requests, but required careful session lifecycle management to avoid connection leaks
- Building for a real university audience (UVA) meant our emergency resources and wellness recommendations had to be specific and actionable — generic advice gets ignored

---

## 📄 License

MIT
