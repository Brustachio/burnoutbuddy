import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Timer, User, Bell, Palette } from "lucide-react";
import type { TimerSettings } from "@/pages/Index";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: TimerSettings;
  onSave: (s: TimerSettings) => void;
}

const sections = [
  { id: "timer", label: "Pomodoro Timer", icon: Timer },
  { id: "account", label: "Account Settings", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;

type SectionId = (typeof sections)[number]["id"];

export const SettingsDialog = ({ open, onOpenChange, settings, onSave }: Props) => {
  const [active, setActive] = useState<SectionId>("timer");
  const [draft, setDraft] = useState(settings);

  const update = (key: keyof TimerSettings, value: string) => {
    const num = Math.max(1, parseInt(value) || 1);
    setDraft((d) => ({ ...d, [key]: num }));
  };

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const timerFields: { key: keyof TimerSettings; label: string }[] = [
    { key: "workMinutes", label: "Work Duration (min)" },
    { key: "breakMinutes", label: "Break Duration (min)" },
    { key: "longBreakMinutes", label: "Long Break (min)" },
    { key: "sessionsBeforeLongBreak", label: "Sessions Before Long Break" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex h-[28rem]">
          {/* Sidebar */}
          <div className="w-48 shrink-0 border-r border-border bg-secondary/30 p-3 flex flex-col gap-0.5">
            <span className="mb-3 px-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Settings
            </span>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                  active === s.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                <span className="font-mono">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {active === "timer" && (
              <div className="space-y-5">
                <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                  Pomodoro Timer
                </h3>
                {timerFields.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      {label}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={draft[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className="bg-secondary/50 border-border font-mono"
                    />
                  </div>
                ))}
                <Button
                  onClick={handleSave}
                  className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
                >
                  Save Settings
                </Button>
              </div>
            )}

            {active === "account" && (
              <div className="space-y-4">
                <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                  Account Settings
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Account management coming soon.
                </p>
              </div>
            )}

            {active === "notifications" && (
              <div className="space-y-4">
                <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                  Notifications
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Notification preferences coming soon.
                </p>
              </div>
            )}

            {active === "appearance" && (
              <div className="space-y-4">
                <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                  Appearance
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Theme customization coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
