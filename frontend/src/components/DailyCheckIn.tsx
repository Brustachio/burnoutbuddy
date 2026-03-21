import { useState } from "react";
import { ChevronUp, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CheckInData {
  productivity: number;
  wellbeing: number;
  notes: string;
}

interface Props {
  onSubmit?: (data: CheckInData) => void;
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-semibold text-foreground tabular-nums w-4 text-right">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
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
            ((value - 1) / 9) * 100
          }%, var(--border) ${((value - 1) / 9) * 100}%, var(--border) 100%)`,
        }}
      />
      <div className="flex justify-between">
        <span className="text-[9px] text-muted-foreground/50">1</span>
        <span className="text-[9px] text-muted-foreground/50">10</span>
      </div>
    </div>
  );
}

const DEFAULT_PRODUCTIVITY = 5;
const DEFAULT_WELLBEING = 5;

export const DailyCheckIn = ({ onSubmit }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const [productivity, setProductivity] = useState(DEFAULT_PRODUCTIVITY);
  const [wellbeing, setWellbeing] = useState(DEFAULT_WELLBEING);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Track whether the user has interacted with sliders
  const [touched, setTouched] = useState(false);

  const handleProductivity = (v: number) => {
    setProductivity(v);
    setTouched(true);
  };
  const handleWellbeing = (v: number) => {
    setWellbeing(v);
    setTouched(true);
  };

  const handleSubmit = () => {
    if (!touched) return;
    onSubmit?.({ productivity, wellbeing, notes });
    setSubmitted(true);
  };

  const handleReset = () => {
    setProductivity(DEFAULT_PRODUCTIVITY);
    setWellbeing(DEFAULT_WELLBEING);
    setNotes("");
    setTouched(false);
    setSubmitted(false);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-[8.5rem] right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Open daily check-in"
      >
        <ClipboardCheck className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-[8.5rem] right-6 z-40 w-72 rounded-md border border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-xs text-muted-foreground">
          Daily Check-in
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Collapse"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-4">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <span className="text-xs text-muted-foreground text-center">
              Logged. Keep going!
            </span>
            <button
              onClick={handleReset}
              className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Reset
            </button>
          </div>
        ) : (
          <>
            {/* Sliders */}
            <SliderRow
              label="Productivity"
              value={productivity}
              onChange={handleProductivity}
            />
            <SliderRow
              label="Well-being"
              value={wellbeing}
              onChange={handleWellbeing}
            />

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Quick reflection…"
                rows={2}
                className="w-full resize-none rounded-md bg-secondary border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!touched}
              className="w-full h-8 text-xs disabled:opacity-30"
            >
              Submit
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
