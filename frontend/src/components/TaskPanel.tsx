import { useState, useRef, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, GripVertical, ChevronUp, ListTodo } from "lucide-react";

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: number;
}

const PRIORITY_LABELS: Record<number, string> = { 1: "high", 2: "med", 3: "low" };

export const TaskPanel = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(320);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((t) => [
      ...t,
      { id: crypto.randomUUID(), title: newTask.trim(), done: false, priority: 2 },
    ]);
    setNewTask("");
  };

  const toggleDone = (id: string) =>
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const remove = (id: string) => setTasks((t) => t.filter((x) => x.id !== id));

  const cyclePriority = (id: string) =>
    setTasks((t) =>
      t.map((x) =>
        x.id === id ? { ...x, priority: x.priority >= 3 ? 1 : x.priority + 1 } : x
      )
    );

  // Drag-to-reorder
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
  };
  const handleDragEnter = (idx: number) => {
    dragOver.current = idx;
  };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const copy = [...sorted];
    const [removed] = copy.splice(dragItem.current, 1);
    copy.splice(dragOver.current, 0, removed);
    setTasks(copy);
    dragItem.current = null;
    dragOver.current = null;
  };

  // Resize handle
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: panelHeight };
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - ev.clientY;
        setPanelHeight(Math.max(160, Math.min(600, dragRef.current.startH + delta)));
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [panelHeight]
  );

  const sorted = [...tasks].sort(
    (a, b) => a.priority - b.priority || Number(a.done) - Number(b.done)
  );

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-6 left-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <ListTodo className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 left-6 z-40 flex flex-col rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-2xl"
      style={{ width: 300, height: panelHeight }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="flex cursor-ns-resize items-center justify-center py-1.5"
      >
        <div className="h-1 w-8 rounded-full bg-border" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Tasks
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronUp className="h-3.5 w-3.5 rotate-180" />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 scrollbar-thin">
        {sorted.length === 0 && (
          <p className="py-6 text-center font-mono text-[10px] text-muted-foreground">
            No tasks yet
          </p>
        )}
        {sorted.map((task, idx) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/60 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-3 w-3 text-border opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            <Checkbox
              checked={task.done}
              onCheckedChange={() => toggleDone(task.id)}
              className="h-3.5 w-3.5"
            />
            <span
              className={`flex-1 truncate font-mono text-xs ${
                task.done
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {task.title}
            </span>
            <button
              onClick={() => cyclePriority(task.id)}
              className="shrink-0"
            >
              <Badge
                variant="outline"
                className="cursor-pointer font-mono text-[9px] uppercase tracking-widest border-border text-muted-foreground hover:text-foreground px-1.5 py-0"
              >
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            </button>
            <button
              onClick={() => remove(task.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add task input */}
      <div className="flex gap-1.5 border-t border-border px-3 py-2.5">
        <Input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add task…"
          className="h-7 bg-secondary/50 border-none font-mono text-xs placeholder:text-muted-foreground/60"
        />
        <Button
          onClick={addTask}
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
