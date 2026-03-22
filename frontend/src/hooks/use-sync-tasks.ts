import { useState, useCallback } from "react";
import type { Task } from "@/context/SessionContext";
import { calendarApi } from "@/services/api";
import type { CalendarEvent } from "@/types/api";

export interface SyncState {
  status: "idle" | "syncing-calendar" | "generating-tasks" | "complete" | "error";
  tasks: Task[];
  error?: string;
}

export function useSyncTasks() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    tasks: [],
  });

  const startSync = useCallback(async () => {
    setSyncState({ status: "syncing-calendar", tasks: [] });

    const raw = localStorage.getItem("burnoutbuddy_google_calendar_events_v1");
    if (!raw) {
      setSyncState({ status: "error", tasks: [], error: "No calendar events found. Have you connected Google Calendar?" });
      return;
    }

    let events: CalendarEvent[];
    try {
      events = JSON.parse(raw);
    } catch {
      setSyncState({ status: "error", tasks: [], error: "Failed to read calendar data." });
      return;
    }

    if (!events.length) {
      setSyncState({ status: "error", tasks: [], error: "No upcoming events on your calendar." });
      return;
    }

    setSyncState({ status: "generating-tasks", tasks: [] });

    try {
      const data = await calendarApi.parseTasks(events);
      const newTasks: Task[] = data.tasks.map((t) => ({
        id: crypto.randomUUID(),
        title: t.title,
        done: false,
        priority: t.priority,
        reasoning: t.reasoning,
      }));

      setSyncState({ status: "complete", tasks: newTasks });
    } catch (e) {
      setSyncState({
        status: "error",
        tasks: [],
        error: e instanceof Error ? e.message : "Failed to generate tasks.",
      });
    }
  }, []);

  return { syncState, startSync };
}
