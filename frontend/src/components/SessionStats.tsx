import { useState } from "react";
import { ChevronUp, BarChart2 } from "lucide-react";
import { useSession } from "@/context/SessionContext";

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
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      <span
        className={`font-mono text-xs tabular-nums ${
          accent ? "text-blue-400" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export const SessionStats = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { stats } = useSession();

  const {
    focusCount,
    shortBreakCount,
    longBreakCount,
    cyclesCompleted,
    totalElapsedSeconds,
    tasksCompleted,
  } = stats;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-20 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Open session stats"
      >
        <BarChart2 className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-36 right-6 z-40 w-64 rounded-xl border border-white/10 bg-card/90 backdrop-blur-md shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
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

      <div className="px-4 pb-3">
        <StatRow label="Focus phases" value={focusCount} />
        <StatRow label="Short breaks" value={shortBreakCount} />
        <StatRow label="Long breaks" value={longBreakCount} />
        <StatRow label="Cycles (4 focus)" value={cyclesCompleted} accent />
        <StatRow label="Elapsed" value={formatHMS(totalElapsedSeconds)} accent />
        <StatRow label="Tasks done" value={tasksCompleted} />
      </div>
    </div>
  );
};
