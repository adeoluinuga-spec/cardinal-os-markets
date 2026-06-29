"use client";

import { useState, type FormEvent } from "react";
import { Bot, ClipboardCheck, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type Draft = {
  customer_name?: string;
  customer_phone?: string;
  items?: { product_name: string; quantity: number; notes?: string }[];
  delivery_address?: string;
  delivery_date?: string | null;
  confidence?: string;
};

type ActionItem = { title: string; reason: string; priority: "high" | "medium" | "low" };

export default function AutopilotPage() {
  const { isOnline } = useOnlineStatus();
  const [conversation, setConversation] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline) return;
    if (!isOnline) return;
    setIsLoading(true);
    const response = await fetch("/api/autopilot/extract-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation }),
    });
    const data = await response.json();
    setDraft(data.draft ?? null);
    setIsLoading(false);
  }

  async function scan() {
    setIsLoading(true);
    const response = await fetch("/api/autopilot/scan", { method: "POST" });
    const data = await response.json();
    setActions(data.actions ?? []);
    setIsLoading(false);
  }

  function sendDraftToOrders() {
    if (draft) {
      window.sessionStorage.setItem("cardinal-autopilot-draft", JSON.stringify(draft));
      window.location.href = "/app/orders";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Autopilot" subtitle="Light command centre for turning customer messages into order drafts and surfacing today’s recommended actions." />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-primary" />
            <h2 className="font-display text-2xl font-bold text-ink">Commerce Inbox</h2>
          </div>
          <form onSubmit={extract} className="mt-4 space-y-4">
            <textarea
              value={conversation}
              onChange={(event) => setConversation(event.target.value)}
              placeholder="Paste a WhatsApp, Instagram, phone note, or walk-in conversation..."
              className="min-h-48 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
              required
            />
            <Button
              type="submit"
              disabled={isLoading || !isOnline}
              title={!isOnline ? "Available when you're back online" : undefined}
            >
              <Wand2 className="h-4 w-4" />
              Extract Order
            </Button>
          </form>
          {draft ? (
            <div className="mt-5 rounded-xl border border-blue-border bg-blue-pale p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{draft.customer_name || "Customer unknown"}</p>
                <Badge variant={draft.confidence === "high" ? "green" : draft.confidence === "medium" ? "gold" : "red"}>{draft.confidence ?? "low"} confidence</Badge>
              </div>
              <p className="mt-1 text-sm text-ink2">{draft.customer_phone}</p>
              <ul className="mt-4 space-y-2 text-sm text-ink">
                {(draft.items ?? []).map((item, index) => (
                  <li key={`${item.product_name}-${index}`}>{item.quantity} x {item.product_name}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-ink2">{draft.delivery_address}</p>
              <Button
                className="mt-4"
                onClick={sendDraftToOrders}
                disabled={!isOnline}
                title={!isOnline ? "Available when you're back online" : undefined}
              >
                Create Quote Draft
              </Button>
            </div>
          ) : null}
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-primary" />
              <h2 className="font-display text-2xl font-bold text-ink">Action Centre</h2>
            </div>
            <Button
              variant="ghost"
              onClick={scan}
              disabled={!isOnline}
              title={!isOnline ? "Available when you're back online" : undefined}
            >
              Scan
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {actions.length === 0 ? <p className="text-sm text-ink2">Run a scan to see today’s follow-ups, risks, and opportunities.</p> : null}
            {actions.map((action, index) => (
              <div key={`${action.title}-${index}`} className="rounded-xl border border-blue-border p-4">
                <Badge variant={action.priority === "high" ? "red" : action.priority === "medium" ? "gold" : "blue"}>{action.priority}</Badge>
                <p className="mt-3 font-semibold text-ink">{action.title}</p>
                <p className="mt-1 text-sm text-ink2">{action.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
