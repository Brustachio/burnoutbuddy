import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  recordFocus: () => void;
  recordShortBreak: () => void;
  recordLongBreak: () => void;
  addElapsed: (seconds: number) => void;
  setTasksCompleted: (count: number) => void;
  resetSession: () => void;
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

export function SessionProvider({
  children,
  sessionsBeforeLongBreak = 4,
}: {
  children: ReactNode;
  sessionsBeforeLongBreak?: number;
}) {
  const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS);

  const recordFocus = useCallback(() => {
    setStats((s) => {
      const next = s.focusCount + 1;
      return {
        ...s,
        focusCount: next,
        cyclesCompleted: Math.floor(next / sessionsBeforeLongBreak),
      };
    });
  }, [sessionsBeforeLongBreak]);

  const recordShortBreak = useCallback(() => {
    setStats((s) => ({ ...s, shortBreakCount: s.shortBreakCount + 1 }));
  }, []);

  const recordLongBreak = useCallback(() => {
    setStats((s) => ({ ...s, longBreakCount: s.longBreakCount + 1 }));
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

  return (
    <SessionContext.Provider
      value={{
        stats,
        recordFocus,
        recordShortBreak,
        recordLongBreak,
        addElapsed,
        setTasksCompleted,
        resetSession,
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
