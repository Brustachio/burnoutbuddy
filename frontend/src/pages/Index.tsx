import { useState } from "react";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { TaskPanel } from "@/components/TaskPanel";
import { SettingsDialog } from "@/components/SettingsDialog";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { SessionStats } from "@/components/SessionStats";
import { SessionProvider } from "@/context/SessionContext";
import { CalendarDays, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";

export interface TimerSettings {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

const DEFAULT_SETTINGS: TimerSettings = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

const Index = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"timer" | "account">("timer");

  return (
    <SessionProvider sessionsBeforeLongBreak={settings.sessionsBeforeLongBreak}>
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
        {/* Full-screen timer */}
        <PomodoroTimer settings={settings} />

        {/* Bottom-left task panel */}
        <TaskPanel />

        {/* Daily check-in — anchored to the right, above the action buttons */}
        <DailyCheckIn />

        {/* Session stats — above the bottom-right action buttons */}
        <SessionStats />

        {/* Bottom-center quick actions */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/calendar")}
            className="h-10 w-10 rounded-full bg-secondary/80 backdrop-blur-sm hover:bg-accent"
          >
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSettingsSection("timer");
              setSettingsOpen(true);
            }}
            className="h-10 w-10 rounded-full bg-secondary/80 backdrop-blur-sm hover:bg-accent"
          >
            <SettingsIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Settings dialog */}
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          initialSection={settingsSection}
          settings={settings}
          onSave={setSettings}
        />
      </div>
    </SessionProvider>
  );
};

export default Index;
