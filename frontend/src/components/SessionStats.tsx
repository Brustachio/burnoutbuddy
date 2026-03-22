import { useState, useEffect } from "react";
import { ChevronUp, BarChart2 } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { supabase } from "@/lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface AllTimeStats {
  total_sessions: number;
  total_focus_sessions: number;
  total_break_sessions: number;
}

function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

interface StatRowProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatRow({ label, value, accent }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-sm tabular-nums ${
          accent ? "text-foreground font-semibold" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export const SessionStats = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [allTime, setAllTime] = useState<AllTimeStats | null>(null);
  const { stats } = useSession();

  const {
    focusCount,
    shortBreakCount,
    longBreakCount,
    cyclesCompleted,
    totalElapsedSeconds,
    tasksCompleted,
  } = stats;

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      const googleToken = session?.provider_token || localStorage.getItem("google_provider_token") || "";
      if (!googleToken) return;
      try {
        const res = await fetch(`${API_URL}/api/sessions/stats`, {
          headers: { "X-Google-Access-Token": googleToken },
        });
        if (res.ok) {
          setAllTime(await res.json());
        }
      } catch {
        // silently ignore fetch errors
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {collapsed ? (
        <button
          key="icon"
          onClick={() => setCollapsed(false)}
          className="popup-enter flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Open session stats"
        >
          <BarChart2 className="h-5 w-5" />
        </button>
      ) : (
        <div key="panel" className="popup-enter w-72 rounded-md border border-border bg-card flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-sm text-muted-foreground">
              Session Stats
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Collapse"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">This Session</p>
            <StatRow label="Focus phases" value={focusCount} />
            <StatRow label="Short breaks" value={shortBreakCount} />
            <StatRow label="Long breaks" value={longBreakCount} />
            <StatRow label="Cycles (4 focus)" value={cyclesCompleted} accent />
            <StatRow label="Elapsed" value={formatHMS(totalElapsedSeconds)} accent />
            <StatRow label="Tasks done" value={tasksCompleted} />
          </div>

          {allTime && (
            <div className="px-4 pb-4 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">All Time</p>
              <StatRow label="Total sessions" value={allTime.total_sessions} accent />
              <StatRow label="Focus sessions" value={allTime.total_focus_sessions} />
              <StatRow label="Break sessions" value={allTime.total_break_sessions} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
