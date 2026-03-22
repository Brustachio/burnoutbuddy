// Types matching backend/app/schemas/schemas.py

// --- Users ---
export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
}

// --- Daily Check-ins ---
export interface DailyCheckinCreate {
  mood: number;
  sleep_hours: number;
  stress_level: number;
  workload_rating: number;
  notes?: string;
}

export interface DailyCheckinResponse extends DailyCheckinCreate {
  id: number;
  user_id: string;
  date: string;
}

// --- Pomodoro Sessions ---
export interface PomodoroSessionCreate {
  task_id?: number | null;
  start_time: string;
  end_time: string;
  session_type: string;
  perceived_difficulty?: number | null;
}

export interface PomodoroSessionResponse extends PomodoroSessionCreate {
  id: number;
  user_id: string;
}

export interface PomodoroSessionStatsResponse {
  total_sessions: number;
  total_focus_sessions: number;
  total_break_sessions: number;
}

// --- Risk ---
export interface RiskScoreResponse {
  risk_level: string;
  details: string;
}

// --- Calendar ---
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string | null;
  location?: string | null;
  source: string;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
}

// --- AI Tasks ---
export interface GeneratedTask {
  title: string;
  priority: number;
  reasoning: string;
}

// --- FastAPI 422 Error ---
export interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ApiValidationError {
  detail: ValidationErrorDetail[];
}
