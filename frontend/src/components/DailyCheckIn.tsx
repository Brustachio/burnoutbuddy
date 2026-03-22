import { useState, useMemo } from "react";
import { ChevronUp, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { WELLNESS_MAP, RECOMMENDATION_PRIORITY } from "@/data/uva-wellness-map";
import { checkinApi, riskApi, ApiError } from "@/services/api";
import type { RiskScoreResponse } from "@/types/api";

const CHECKIN_DATE_KEY = "burnoutbuddy_checkin_date";

function getTodayKey(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

const FEELING_OPTIONS = [
  { id: "great", label: "I'm feeling great about this session" },
  { id: "overwhelmed", label: "I'm feeling a bit overwhelmed" },
  { id: "behind", label: "I'm way behind and I'm not sure I'll get this done" },
  { id: "stressed", label: "I'm very stressed" },
  { id: "focused", label: "I feel focused and productive" },
  { id: "need-break", label: "I need a longer break" },
] as const;

function SliderRow({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-semibold text-foreground tabular-nums w-8 text-right">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full h-1 appearance-none rounded-full cursor-pointer
          bg-border
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-foreground
          [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:w-3
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-foreground
          [&::-moz-range-thumb]:border-none
        "
        style={{
          background: `linear-gradient(to right, var(--foreground) 0%, var(--foreground) ${
            ((value - min) / (max - min)) * 100
          }%, var(--border) ${((value - min) / (max - min)) * 100}%, var(--border) 100%)`,
        }}
      />
      <div className="flex justify-between">
        <span className="text-[9px] text-muted-foreground/50">{min}</span>
        <span className="text-[9px] text-muted-foreground/50">{max}</span>
      </div>
    </div>
  );
}

const RISK_COLORS: Record<string, string> = {
  Low: "bg-green-500/20 text-green-700 dark:text-green-400",
  Med: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  High: "bg-red-500/20 text-red-700 dark:text-red-400",
};

export const DailyCheckIn = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(CHECKIN_DATE_KEY) === getTodayKey();
    } catch {
      return false;
    }
  });
  const [mood, setMood] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [sleepHours, setSleepHours] = useState(7);
  const [workloadRating, setWorkloadRating] = useState(5);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScoreResponse | null>(null);

  const [touched, setTouched] = useState(false);

  const handleSlider = (setter: (v: number) => void) => (v: number) => {
    setter(v);
    setTouched(true);
  };

  const toggleFeeling = (id: string) => {
    setFeelings((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
    setTouched(true);
  };

  const handleSubmit = async () => {
    if (!touched) return;
    setIsLoading(true);
    setError(null);

    const notes = feelings.length > 0
      ? feelings.map((id) => FEELING_OPTIONS.find((o) => o.id === id)?.label ?? id).join(", ")
      : undefined;

    try {
      await checkinApi.create({
        mood,
        sleep_hours: sleepHours,
        stress_level: stressLevel,
        workload_rating: workloadRating,
        notes,
      });
      setSubmitted(true);
      try { localStorage.setItem(CHECKIN_DATE_KEY, getTodayKey()); } catch { /* ignore */ }

      // Fetch risk score after successful check-in
      try {
        const risk = await riskApi.getScore();
        setRiskScore(risk);
      } catch {
        // Risk score is optional — don't block the UI
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Failed to submit check-in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const recommendation = useMemo(() => {
    const match = RECOMMENDATION_PRIORITY.find((id) => feelings.includes(id));
    return match ? WELLNESS_MAP[match] : null;
  }, [feelings]);

  const handleReset = () => {
    setMood(5);
    setStressLevel(5);
    setSleepHours(7);
    setWorkloadRating(5);
    setFeelings([]);
    setTouched(false);
    setSubmitted(false);
    setError(null);
    setRiskScore(null);
  };

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40">
      {collapsed ? (
        <button
          key="icon"
          onClick={() => setCollapsed(false)}
          className="popup-enter flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Open daily check-in"
        >
          <ClipboardCheck className="h-5 w-5" />
        </button>
      ) : (
        <div key="panel" className="popup-enter w-72 rounded-md border border-border bg-card flex flex-col max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-sm text-muted-foreground">
          Daily Check-in
        </span>
        <button
          onClick={() => {
            try { localStorage.setItem(CHECKIN_DATE_KEY, getTodayKey()); } catch { /* ignore */ }
            setCollapsed(true);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Collapse"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-4">
        {submitted ? (
          <div className="flex flex-col gap-3 py-2">
            <span className="text-xs text-muted-foreground text-center">
              Logged. Keep going!
            </span>

            {riskScore && (
              <div className="rounded-md bg-secondary/60 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Burnout Risk</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${RISK_COLORS[riskScore.risk_level] || ""}`}>
                    {riskScore.risk_level}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{riskScore.details}</p>
              </div>
            )}

            {recommendation && (
              <div className="rounded-md bg-secondary/60 p-3">
                <p className="text-xs font-medium text-foreground">{recommendation.location}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{recommendation.description}</p>
                <p className="text-[10px] text-muted-foreground/80 mt-1 italic">{recommendation.suggestion}</p>
              </div>
            )}
            <button
              onClick={handleReset}
              className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Reset
            </button>
          </div>
        ) : (
          <>
            <SliderRow
              label="Mood"
              value={mood}
              onChange={handleSlider(setMood)}
            />
            <SliderRow
              label="Stress Level"
              value={stressLevel}
              onChange={handleSlider(setStressLevel)}
            />
            <SliderRow
              label="Workload"
              value={workloadRating}
              onChange={handleSlider(setWorkloadRating)}
            />
            <SliderRow
              label="Sleep (hours)"
              value={sleepHours}
              onChange={handleSlider(setSleepHours)}
              min={0}
              max={12}
              step={0.5}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">How are you feeling?</span>
              <div className="flex flex-col gap-2">
                {FEELING_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={feelings.includes(opt.id)}
                      onCheckedChange={() => toggleFeeling(opt.id)}
                      className="mt-0.5 h-3.5 w-3.5"
                    />
                    <span className="text-xs text-foreground leading-tight">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && (
              <p className="text-[10px] text-destructive">{error}</p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!touched || isLoading}
              className="w-full h-9 text-sm disabled:opacity-30"
            >
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          </>
        )}
      </div>
        </div>
      )}
    </div>
  );
};
