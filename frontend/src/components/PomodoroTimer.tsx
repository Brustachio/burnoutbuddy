import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Play, Pause, RotateCcw, SkipForward, SkipBack, PictureInPicture2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePip } from "@/hooks/use-pip";
import type { TimerSettings } from "@/pages/Index";

type phase = "work" | "break" | "longBreak";

interface Props {
  settings: TimerSettings;
}

function formatTime(totalSecs: number): string {
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export const PomodoroTimer = ({ settings }: Props) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(settings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const alarmRef = useRef<HTMLAudioElement>(null);
  const timerContentRef = useRef<HTMLDivElement>(null);
  const { pipWindow, isSupported: isPiPSupported, togglePip } = usePip({ targetRef: timerContentRef });

   useEffect(() => {
    alarmRef.current = new Audio("alarm.mp3");
    alarmRef.current.load();
  }, []);

  const cycle: phase[] = (() => {
    const c: phase[] = [];
    for (let i = 0; i < settings.sessionsBeforeLongBreak; i++) {
      c.push("work");
      c.push(i === settings.sessionsBeforeLongBreak - 1 ? "longBreak" : "break");
    }
    return c;
  })();

  const phase: phase = cycle[phaseIndex % cycle.length] ?? "work";

  const setPhase = (p: phase) => {
    const idx = cycle.indexOf(p);
    if (idx !== -1) setPhaseIndex(idx);
  };

  const totalSeconds =
    phase === "work"
      ? settings.workMinutes * 60
      : phase === "break"
      ? settings.breakMinutes * 60
      : settings.longBreakMinutes * 60;

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    setIsRunning(false);
  }, [settings]);

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    setIsRunning(false);
  }, [phaseIndex]);

  useEffect(() => {
    if (!isRunning) return;
    if (secondsLeft <= 0) {
      alarmRef.current?.play();
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
  }, [isRunning, secondsLeft, phase]);

  const reset = () => {
    setIsRunning(false);
    setPhaseIndex(0);
    setCompletedSessions(0);
  };

  const skip = () => {
    if (phase === "work") setCompletedSessions((s) => s + 1);
    setPhaseIndex((i) => (i + 1) % cycle.length);
  };

  const previous = () => {
    setPhaseIndex((i) => (i - 1 + cycle.length) % cycle.length);
  };

  const progress = 1 - secondsLeft / totalSeconds;

  const phaseLabel =
    phase === "work" ? "Focus" : phase === "break" ? "Short Break" : "Long Break";

  useEffect(() => {
    document.title = isRunning
      ? `${phaseLabel} ${formatTime(secondsLeft)} — BurnoutBuddy`
      : "BurnoutBuddy";
    return () => {
      document.title = "BurnoutBuddy";
    };
  }, [secondsLeft, isRunning, phaseLabel]);
      
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      {/* Main Stack — phase label + clock + dots + controls */}
      <div ref={timerContentRef} className={`flex flex-col items-center${pipWindow ? " opacity-30 transition-opacity" : " transition-opacity"}`}>
        {/* Phase label — tight to the timer */}
        <span className="block text-sm tracking-widest uppercase text-muted-foreground text-center" style={{ marginBottom: "18px" }}>
          {phaseLabel}
        </span>

        {/* Giant clock */}
        <span
          className="font-medium tracking-tighter text-foreground select-none leading-none"
          style={{ fontSize: "clamp(6rem, 18vw, 14rem)", fontVariantNumeric: "tabular-nums" }}
        >
          {formatTime(secondsLeft)}
        </span>

        {/* Session dots — centered between timer and controls */}
        <div className="mt-5 mb-5 flex justify-center gap-2.5">
          {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i < completedSessions % settings.sessionsBeforeLongBreak ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={previous}
            className="h-11 w-11 rounded-full bg-secondary/60 backdrop-blur-sm hover:bg-accent"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
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
            className="h-11 w-20 rounded-md"
          >
            {isRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={skip}
            className="h-11 w-11 rounded-full bg-secondary/60 backdrop-blur-sm hover:bg-accent"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          {isPiPSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { togglePip().catch(console.error); }}
              className="h-11 w-11 rounded-full bg-secondary/60 backdrop-blur-sm hover:bg-accent"
              aria-label={pipWindow ? "Exit mini-player" : "Open mini-player"}
            >
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Subtle progress bar at very bottom */}
      <div className="fixed bottom-0 left-0 h-[2px] w-full bg-border">
        <div
          className="h-full bg-foreground transition-all duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* PiP portal — borderless, with inline Start/Stop control */}
      {pipWindow && ReactDOM.createPortal(
        <div className="pip-content" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          width: "100vw",
          height: "100vh",
        }}>
          <span style={{
            fontSize: "clamp(0.6rem, 4vw, 0.75rem)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
          }}>
            {phaseLabel}
          </span>
          <span
            className="font-medium tracking-tighter text-foreground select-none leading-none"
            style={{ fontSize: "clamp(2.5rem, 20vw, 5rem)", fontVariantNumeric: "tabular-nums" }}
          >
            {formatTime(secondsLeft)}
          </span>
          <button
            onClick={() => setIsRunning((r) => !r)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--secondary)",
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            {isRunning ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>
        </div>,
        pipWindow.document.body
      )}
    </div>
  );
};
