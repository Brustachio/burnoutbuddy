import { supabase } from "@/lib/supabase";
import type {
  UserResponse,
  CalendarEventsResponse,
  CalendarEvent,
  GeneratedTask,
  DailyCheckinCreate,
  DailyCheckinResponse,
  PomodoroSessionCreate,
  PomodoroSessionResponse,
  PomodoroSessionStatsResponse,
  RiskScoreResponse,
  ApiValidationError,
} from "@/types/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  validation?: ApiValidationError["detail"];

  constructor(message: string, status: number, validation?: ApiValidationError["detail"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.validation = validation;
  }
}

async function getGoogleToken(): Promise<string | null> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.provider_token) return data.session.provider_token;
    if (data.session?.access_token) return data.session.access_token;
  }
  return localStorage.getItem("google_provider_token");
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getGoogleToken();
  if (!token) throw new ApiError("Not authenticated", 401);

  const headers: Record<string, string> = {
    "X-Google-Access-Token": token,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 422 && body?.detail && Array.isArray(body.detail)) {
      const messages = body.detail.map((d: { msg: string }) => d.msg).join("; ");
      throw new ApiError(`Validation error: ${messages}`, 422, body.detail);
    }
    const message = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return res.json();
}

export const authApi = {
  googleLogin: () => apiFetch<UserResponse>("/api/auth/google/login", { method: "POST" }),
};

export const calendarApi = {
  getEvents: () => apiFetch<CalendarEventsResponse>("/api/calendar/google/events"),

  parseTasks: async (events: CalendarEvent[]): Promise<{ tasks: GeneratedTask[] }> => {
    const token = await getGoogleToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["X-Google-Access-Token"] = token;

    const res = await fetch(`${API_URL}/api/ai/parse-calendar-tasks`, {
      method: "POST",
      headers,
      body: JSON.stringify({ events }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(body?.detail || "Failed to parse tasks", res.status);
    }
    return res.json();
  },
};

export const checkinApi = {
  create: (data: DailyCheckinCreate) =>
    apiFetch<DailyCheckinResponse>("/api/checkins", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const sessionApi = {
  create: (data: PomodoroSessionCreate) =>
    apiFetch<PomodoroSessionResponse>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getStats: () => apiFetch<PomodoroSessionStatsResponse>("/api/sessions/stats"),
};

export const riskApi = {
  getScore: () => apiFetch<RiskScoreResponse>("/api/risk-score"),
};
