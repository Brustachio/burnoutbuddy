import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/Spinner";
import type { SyncState } from "@/hooks/use-sync-tasks";

const PRIORITY_LABELS: Record<number, string> = { 1: "high", 2: "med", 3: "low" };

interface Props {
  open: boolean;
  syncState: SyncState;
  onConfirm: () => void;
  onSkip: () => void;
  onOpenChange: (open: boolean) => void;
}

export const SyncPopup = ({ open, syncState, onConfirm, onSkip, onOpenChange }: Props) => {
  const { status, tasks, error } = syncState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === "complete" ? "Your session tasks" : status === "error" ? "Sync issue" : "Preparing your session"}
          </DialogTitle>
          {(status === "syncing-calendar" || status === "generating-tasks") && (
            <DialogDescription>
              {status === "syncing-calendar"
                ? "Syncing your calendar..."
                : "Creating tasks for this session..."}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Loading states */}
        {(status === "syncing-calendar" || status === "generating-tasks") && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner className="h-6 w-6" />
            <p className="text-sm text-muted-foreground">
              {status === "syncing-calendar"
                ? "Reading your Google Calendar events..."
                : "AI is analyzing your schedule and prioritizing tasks..."}
            </p>
          </div>
        )}

        {/* Complete — show task list */}
        {status === "complete" && (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-2 rounded-md border border-border px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground truncate">{task.title}</span>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[9px] border-border text-muted-foreground px-1.5 py-0"
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                  </div>
                  {task.reasoning && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{task.reasoning}</p>
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks generated. You can add tasks manually.
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              {error || "Something went wrong."}
            </p>
          </div>
        )}

        {/* Footer buttons */}
        {status === "complete" && (
          <DialogFooter>
            <Button onClick={onConfirm} className="w-full">
              Let's Go
            </Button>
          </DialogFooter>
        )}

        {status === "error" && (
          <DialogFooter>
            <Button onClick={onSkip} variant="outline" className="w-full">
              Start without tasks
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
