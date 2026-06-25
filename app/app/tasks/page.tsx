"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "complete";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  assigned_to: string | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [isLoading, setIsLoading] = useState(true);

  async function loadTasks() {
    setIsLoading(true);
    const response = await fetch("/api/tasks", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { tasks: Task[] };
      setTasks(data.tasks ?? []);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority }),
    });
    if (response.ok) {
      setTitle("");
      setPriority("medium");
      void loadTasks();
    }
  }

  async function markDone(id: string) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "complete" }),
    });
    void loadTasks();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" subtitle="A lightweight action list for follow-ups, stock checks, payment chasing, and team handoffs." />
      <Card>
        <form onSubmit={createTask} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task..." />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Task["priority"])}
            className="h-10 rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </form>
      </Card>
      <div className="space-y-3">
        {isLoading ? <Card>Loading tasks...</Card> : null}
        {!isLoading && tasks.length === 0 ? <Card>No open tasks yet.</Card> : null}
        {tasks.map((task) => (
          <Card key={task.id} className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", task.status === "complete" && "opacity-60")}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{task.title}</p>
                <Badge variant={task.priority === "high" ? "red" : task.priority === "medium" ? "gold" : "blue"}>{task.priority}</Badge>
              </div>
              {task.description ? <p className="mt-1 text-sm text-ink2">{task.description}</p> : null}
            </div>
            {task.status !== "complete" ? (
              <Button variant="ghost" onClick={() => markDone(task.id)}>
                <CheckCircle2 className="h-4 w-4" />
                Done
              </Button>
            ) : (
              <Badge variant="green">Done</Badge>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
