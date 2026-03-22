import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { TaskPanel } from "@/components/TaskPanel";
import { SettingsDialog } from "@/components/SettingsDialog";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { SessionProvider } from "@/context/SessionContext";
import { CalendarDays, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";
import {
  containerVariants,
  itemVariants,
  reducedMotionItemVariants,
} from "@/lib/animations";

export interface TimerSettings {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartNextTimer: boolean;
}

const DEFAULT_SETTINGS: TimerSettings = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartNextTimer: false,
};

const SETTINGS_STORAGE_KEY = "burnoutbuddy_timer_settings";

function loadSettings(): TimerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

const Index = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TimerSettings>(() => loadSettings());
  const shouldReduceMotion = useReducedMotion();

  const activeItemVariants = shouldReduceMotion
    ? reducedMotionItemVariants
    : itemVariants;

  const handleSaveSettings = (s: TimerSettings) => {
    setSettings(s);
    try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"timer" | "account">("timer");

  return (
    <SessionProvider sessionsBeforeLongBreak={settings.sessionsBeforeLongBreak}>
      <motion.div
        className="relative min-h-screen bg-background text-foreground overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Full-screen timer */}
        <motion.div variants={activeItemVariants}>
          <PomodoroTimer settings={settings} />
        </motion.div>

        {/* Bottom-left task panel */}
        <motion.div variants={activeItemVariants}>
          <TaskPanel />
        </motion.div>

        {/* Daily check-in */}
        <motion.div variants={activeItemVariants}>
          <DailyCheckIn />
        </motion.div>

        {/* Bottom-center quick actions */}
        <motion.div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2"
          variants={activeItemVariants}
        >
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
        </motion.div>

        {/* Settings dialog */}
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          initialSection={settingsSection}
          settings={settings}
          onSave={handleSaveSettings}
        />
      </motion.div>
    </SessionProvider>
  );
};

export default Index;
