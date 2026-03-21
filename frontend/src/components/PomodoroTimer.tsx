import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimerSettings } from "@/pages/Index";

type Phase = "work" | "break" | "longBreak";

interface Props {
  settings: TimerSettings;
}

export const PomodoroTimer = ({ settings }: Props) => {
  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(settings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const totalSeconds =
    phase === "work"
      ? settings.workMinutes * 60
      : phase === "break"
      ? settings.breakMinutes * 60
      : settings.longBreakMinutes * 60;

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    setIsRunning(false);
  }, [settings, phase]);

  useEffect(() => {
    if (!isRunning) return;
    if (secondsLeft <= 0) {
      if (phase === "work") {
        const next =
          (completedSessions + 1) % settings.sessionsBeforeLongBreak === 0
            ? "longBreak"
            : "break";
        setCompletedSessions((s) => s + 1);
        setPhase(next);
      } else {
        setPhase("work");
      }
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, secondsLeft, phase, completedSessions, settings]);

  const reset = () => {
    setIsRunning(false);
    setPhase("work");
    setSecondsLeft(settings.workMinutes * 60);
    setCompletedSessions(0);
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const progress = 1 - secondsLeft / totalSeconds;

  const phaseLabel =
    phase === "work" ? "Focus" : phase === "break" ? "Break" : "Long Break";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      {/* Phase label */}
      <span className="mb-4 font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">
        {phaseLabel}
      </span>

      {/* Giant clock */}
      <div className="relative mb-6">
        <span
          className="font-mono font-bold tracking-tight text-foreground select-none"
          style={{ fontSize: "clamp(5rem, 15vw, 12rem)" }}
        >
          {minutes}:{seconds}
        </span>
      </div>

      {/* Session dots */}
      <div className="mb-8 flex gap-2.5">
        {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i < completedSessions ? "bg-foreground" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={reset}
          className="h-11 w-11 rounded-full bg-secondary/60 backdrop-blur-sm hover:bg-accent"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setIsRunning(!isRunning)}
          className="h-11 w-20 rounded-full font-mono text-xs uppercase tracking-widest"
        >
          {isRunning ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Subtle progress bar at very bottom */}
      <div className="fixed bottom-0 left-0 h-[2px] w-full bg-border">
        <div
          className="h-full bg-foreground transition-all duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};
