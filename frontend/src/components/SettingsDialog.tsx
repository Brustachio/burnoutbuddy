import { useState, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Timer, User, Bell, Palette, Activity } from "lucide-react";
import { MoonIcon, SunIcon } from "lucide-react";
import type { TimerSettings } from "@/pages/Index";
import { useAppState, useAppDispatch, setTheme } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ErrorBoundary } from "@/features/health/ErrorBoundary";
import { HealthStatus } from "@/features/health/HealthStatus";
import { LoadingStatus } from "@/features/health/LoadingStatus";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: TimerSettings;
  onSave: (s: TimerSettings) => void;
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
      <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
        Appearance
      </h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-foreground">Theme</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            Currently {theme === "dark" ? "dark" : "light"} mode
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(dispatch, theme === "light" ? "dark" : "light")}
          className="h-9 w-9 rounded-full"
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

function AccountSection({ onClose }: { onClose: () => void }) {
  const { isAuthenticated, login, register, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await login({
      email: fd.get("email") as string,
      password: fd.get("password") as string,
    });
    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Login failed");
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirmPassword = fd.get("confirmPassword") as string;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    const result = await register({
      email: fd.get("email") as string,
      username: fd.get("username") as string,
      password,
      confirmPassword,
    });
    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Registration failed");
    }
    setIsLoading(false);
  };

  if (isAuthenticated) {
    return (
      <div className="space-y-5">
        <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
          Account
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          You are logged in.
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
        >
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
        Account
      </h3>

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-md bg-secondary/40 p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); }}
            className={`flex-1 rounded py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              mode === m
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "login" ? "Sign In" : "Register"}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Email
            </Label>
            <Input
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              disabled={isLoading}
              className="bg-secondary/50 border-border font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Password
            </Label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="bg-secondary/50 border-border font-mono text-xs"
            />
          </div>
          {error && <p className="font-mono text-[10px] text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Email
            </Label>
            <Input
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              disabled={isLoading}
              className="bg-secondary/50 border-border font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Username
            </Label>
            <Input
              name="username"
              type="text"
              placeholder="Choose a username"
              required
              disabled={isLoading}
              className="bg-secondary/50 border-border font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Password
            </Label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="bg-secondary/50 border-border font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Confirm Password
            </Label>
            <Input
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="bg-secondary/50 border-border font-mono text-xs"
            />
          </div>
          {error && <p className="font-mono text-[10px] text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
          >
            {isLoading ? "Creating account…" : "Register"}
          </Button>
        </form>
      )}
    </div>
  );
}

// ── System tab ────────────────────────────────────────────────────────────────

function SystemSection() {
  return (
    <div className="space-y-5">
      <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
        System
      </h3>
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
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
        <div className="flex h-[32rem]">
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
              <AccountSection onClose={() => onOpenChange(false)} />
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

            {active === "appearance" && <AppearanceSection />}

            {active === "system" && <SystemSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
