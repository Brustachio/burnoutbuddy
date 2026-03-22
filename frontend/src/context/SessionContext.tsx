import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { sessionApi } from "@/services/api";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: number;
  reasoning?: string;
}

export interface SessionStats {
  focusCount: number;
  shortBreakCount: number;
  longBreakCount: number;
  cyclesCompleted: number;
  totalElapsedSeconds: number;
  tasksCompleted: number;
}

interface SessionContextValue {
  stats: SessionStats;
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  isTimerRunning: boolean;
  setTimerRunning: (running: boolean) => void;
  recordFocus: (startTime: Date, endTime: Date) => void;
  recordShortBreak: (startTime: Date, endTime: Date) => void;
  recordLongBreak: (startTime: Date, endTime: Date) => void;
  addElapsed: (seconds: number) => void;
  setTasksCompleted: (count: number) => void;
  resetSession: () => void;
  triggerEmergency: () => void;
}

const DEFAULT_STATS: SessionStats = {
  focusCount: 0,
  shortBreakCount: 0,
  longBreakCount: 0,
  cyclesCompleted: 0,
  totalElapsedSeconds: 0,
  tasksCompleted: 0,
};

const SessionContext = createContext<SessionContextValue | null>(null);

function recordSessionToBackend(
  sessionType: string,
  startTime: Date,
  endTime: Date,
) {
  sessionApi.create({
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    session_type: sessionType,
  }).catch((e) => {
    console.error("Failed to record session to backend:", e);
  });
}

export function SessionProvider({
  children,
  sessionsBeforeLongBreak = 4,
}: {
  children: ReactNode;
  sessionsBeforeLongBreak?: number;
}) {
  const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTimerRunning, setTimerRunning] = useState(false);

  const recordFocus = useCallback((startTime: Date, endTime: Date) => {
    setStats((s) => {
      const next = s.focusCount + 1;
      return {
        ...s,
        focusCount: next,
        cyclesCompleted: Math.floor(next / sessionsBeforeLongBreak),
      };
    });
    recordSessionToBackend("focus", startTime, endTime);
  }, [sessionsBeforeLongBreak]);

  const recordShortBreak = useCallback((startTime: Date, endTime: Date) => {
    setStats((s) => ({ ...s, shortBreakCount: s.shortBreakCount + 1 }));
    recordSessionToBackend("break", startTime, endTime);
  }, []);

  const recordLongBreak = useCallback((startTime: Date, endTime: Date) => {
    setStats((s) => ({ ...s, longBreakCount: s.longBreakCount + 1 }));
    recordSessionToBackend("break", startTime, endTime);
  }, []);

  const addElapsed = useCallback((seconds: number) => {
    setStats((s) => ({ ...s, totalElapsedSeconds: s.totalElapsedSeconds + seconds }));
  }, []);

  const setTasksCompleted = useCallback((count: number) => {
    setStats((s) => ({ ...s, tasksCompleted: count }));
  }, []);

  const resetSession = useCallback(() => {
    setStats(DEFAULT_STATS);
  }, []);

  const triggerEmergency = useCallback(() => {
    setTimerRunning(false);
    setStats(DEFAULT_STATS);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        stats,
        tasks,
        setTasks,
        isTimerRunning,
        setTimerRunning,
        recordFocus,
        recordShortBreak,
        recordLongBreak,
        addElapsed,
        setTasksCompleted,
        resetSession,
        triggerEmergency,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
