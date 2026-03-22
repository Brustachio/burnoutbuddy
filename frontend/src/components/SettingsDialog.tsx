import { useState, Suspense, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Timer, User, Bell, Palette, Activity } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MoonIcon, SunIcon } from "lucide-react";
import type { TimerSettings } from "@/pages/Index";
import { useAppState, useAppDispatch, setTheme } from "@/context/AppContext";
import { ErrorBoundary } from "@/features/health/ErrorBoundary";
import { HealthStatus } from "@/features/health/HealthStatus";
import { LoadingStatus } from "@/features/health/LoadingStatus";
import { hasSupabaseConfig, supabase, supabaseConfigError } from "@/lib/supabase";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: TimerSettings;
  onSave: (s: TimerSettings) => void;
  initialSection?: SectionId;
}

const sections = [
  { id: "timer", label: "Pomodoro Timer", icon: Timer },
  { id: "account", label: "Account", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "system", label: "System", icon: Activity },
] as const;

type SectionId = (typeof sections)[number]["id"];

// ── Appearance tab ────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <div className="space-y-5">
      <h3 className="text-sm text-muted-foreground">
        Appearance
      </h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-foreground">Theme</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Currently {theme === "dark" ? "dark" : "light"} mode
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(dispatch, theme === "light" ? "dark" : "light")}
          className="h-9 w-9 rounded-md"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        >
          {theme === "light" ? (
            <MoonIcon className="h-4 w-4" />
          ) : (
            <SunIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Account tab ───────────────────────────────────────────────────────────────

function AccountSection() {
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [googleName, setGoogleName] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const supabaseClient = supabase;

    const updateFromSession = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      const linked = Boolean(session);
      setIsGoogleLinked(linked);

      const metadata = session?.user?.user_metadata as Record<string, unknown> | undefined;
      const fullName =
        (typeof metadata?.full_name === "string" && metadata.full_name) ||
        (typeof metadata?.name === "string" && metadata.name) ||
        null;
      const email = session?.user?.email || null;

      setGoogleName(fullName || (email ? email.split("@")[0] : null));
      setGoogleEmail(email);
    };

    void updateFromSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const linked = Boolean(session);
      setIsGoogleLinked(linked);

      const metadata = session?.user?.user_metadata as Record<string, unknown> | undefined;
      const fullName =
        (typeof metadata?.full_name === "string" && metadata.full_name) ||
        (typeof metadata?.name === "string" && metadata.name) ||
        null;
      const email = session?.user?.email || null;

      setGoogleName(fullName || (email ? email.split("@")[0] : null));
      setGoogleEmail(email);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogout = async () => {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase is not configured.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      setError(logoutError.message || "Google logout failed.");
      setIsLoading(false);
      return;
    }

    setIsGoogleLinked(false);
    setGoogleName(null);
    setGoogleEmail(null);
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm text-muted-foreground">
        Account
      </h3>

      {!hasSupabaseConfig && (
        <p className="text-[10px] text-destructive">
          {supabaseConfigError}
        </p>
      )}

      <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Google Calendar
        </p>
        <p className="text-xs text-foreground">
          {isGoogleLinked
            ? `Connected as ${googleName || "Google user"}`
            : "Not connected"}
        </p>
        {isGoogleLinked && googleEmail && (
          <p className="text-[10px] text-muted-foreground">{googleEmail}</p>
        )}

        {isGoogleLinked ? (
          <Button
            variant="outline"
            onClick={handleGoogleLogout}
            disabled={isLoading || !hasSupabaseConfig}
            className="w-full rounded-md text-xs"
          >
            {isLoading ? "Logging out..." : "Log out of Google"}
          </Button>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Sign in from the{" "}
            <a href="/" className="text-primary hover:underline">
              Get Started
            </a>{" "}
            page to connect your Google account.
          </p>
        )}
      </div>

      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

// ── System tab ────────────────────────────────────────────────────────────────

function SystemSection() {
  return (
    <div className="space-y-5">
      <h3 className="text-sm text-muted-foreground">
        System
      </h3>
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">
          Backend Status
        </p>
        <div className="rounded-md border border-border bg-secondary/30 px-4 py-3">
          <ErrorBoundary>
            <Suspense fallback={<LoadingStatus />}>
              <HealthStatus />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export const SettingsDialog = ({
  open,
  onOpenChange,
  settings,
  onSave,
  initialSection = "timer",
}: Props) => {
  const [active, setActive] = useState<SectionId>("timer");
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) {
      setActive(initialSection);
    }
  }, [open, initialSection]);

  const update = (key: keyof TimerSettings, value: string) => {
    const num = Math.max(1, parseInt(value) || 1);
    setDraft((d) => ({ ...d, [key]: num }));
  };

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const timerFields: { key: keyof Pick<TimerSettings, "workMinutes" | "breakMinutes" | "longBreakMinutes" | "sessionsBeforeLongBreak">; label: string }[] = [
    { key: "workMinutes", label: "Work Duration (min)" },
    { key: "breakMinutes", label: "Break Duration (min)" },
    { key: "longBreakMinutes", label: "Long Break (min)" },
    { key: "sessionsBeforeLongBreak", label: "Sessions Before Long Break" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex h-[32rem]">
          {/* Sidebar */}
          <div className="w-48 shrink-0 border-r border-border bg-secondary/30 p-3 flex flex-col gap-0.5">
            <span className="mb-3 px-2 text-[10px] text-muted-foreground">
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
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {active === "timer" && (
              <div className="space-y-5">
                <h3 className="text-sm text-muted-foreground">
                  Pomodoro Timer
                </h3>
                {timerFields.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {label}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={draft[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className="bg-secondary/50 border-border"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Auto-start next timer
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Automatically begin the next phase when the current one ends
                    </p>
                  </div>
                  <Checkbox
                    checked={draft.autoStartNextTimer}
                    onCheckedChange={(checked) =>
                      setDraft((d) => ({ ...d, autoStartNextTimer: checked === true }))
                    }
                  />
                </div>
                <Button
                  onClick={handleSave}
                  className="w-full rounded-md text-xs"
                >
                  Save Settings
                </Button>
              </div>
            )}

            {active === "account" && (
              <AccountSection />
            )}

            {active === "notifications" && (
              <div className="space-y-4">
                <h3 className="text-sm text-muted-foreground">
                  Notifications
                </h3>
                <p className="text-xs text-muted-foreground">
                  Notification preferences coming soon.
                </p>
              </div>
            )}

            {active === "appearance" && <AppearanceSection />}

            {active === "system" && <SystemSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
