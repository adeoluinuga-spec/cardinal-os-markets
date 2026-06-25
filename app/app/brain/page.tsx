"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  BookOpen,
  ChevronDown,
  Database,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string | null;
};

type Source = {
  id: string;
  title: string;
  category: string;
  similarity: number;
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

const CATEGORIES = [
  "products",
  "pricing",
  "processes",
  "policies",
  "suppliers",
  "other",
] as const;

const SUGGESTIONS = [
  "What are our payment terms?",
  "How do we handle a return?",
  "What's the MOQ for wholesale orders?",
  "How do we process an Instagram order?",
];

function label(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BrainPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState({ title: "", category: "processes", content: "" });
  const [saving, setSaving] = useState(false);

  // Chat state
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [openSources, setOpenSources] = useState<number | null>(null);
  const sessionRef = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "session",
  );
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    const res = await fetch("/api/knowledge/list");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, asking]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.category === filter);

  function openAdd() {
    setEditing(null);
    setForm({ title: "", category: "processes", content: "" });
    setModalOpen(true);
  }

  function openEdit(entry: Entry) {
    setEditing(entry);
    setForm({ title: entry.title, category: entry.category, content: entry.content });
    setModalOpen(true);
  }

  async function saveEntry(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    const url = editing
      ? `/api/knowledge/${editing.id}/update`
      : "/api/knowledge/create";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      setToast(editing ? "Entry updated" : "Entry added");
      await loadEntries();
    } else {
      const data = await res.json().catch(() => ({}));
      setToast(data.error ?? "Could not save entry");
    }
  }

  async function deleteEntry(entry: Entry) {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    const res = await fetch(`/api/knowledge/${entry.id}/delete`, { method: "POST" });
    if (res.ok) {
      setToast("Entry deleted");
      await loadEntries();
    }
  }

  async function ask(text: string) {
    const query = text.trim();
    if (!query || asking) return;
    setQuestion("");
    setTurns((prev) => [...prev, { role: "user", content: query }]);
    setAsking(true);
    const res = await fetch("/api/brain/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: query, session_id: sessionRef.current }),
    });
    const data = await res.json().catch(() => ({}));
    setAsking(false);
    if (res.ok) {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources ?? [] },
      ]);
    } else {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message ?? data.error ?? "Something went wrong.",
        },
      ]);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Brain"
        subtitle="Teach the AI about your business, then ask it anything — grounded in your knowledge base and live data."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT — Knowledge Base */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-primary" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-ink">Knowledge Base</h2>
            </div>
            <Button onClick={openAdd} className="h-9 px-3">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Entry
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["all", ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  filter === cat
                    ? "bg-blue-primary text-white"
                    : "bg-blue-pale text-ink2 hover:bg-blue-light",
                )}
              >
                {cat === "all" ? "All" : label(cat)}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {loadingEntries ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Database className="h-6 w-6" />}
                title="No entries yet"
                description="Add what your team knows — payment terms, return policy, wholesale MOQ — so the Brain can answer accurately."
              />
            ) : (
              filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-blue-border bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{entry.title}</p>
                      <Badge variant="blue" className="mt-1">
                        {label(entry.category)}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink2 hover:bg-blue-pale hover:text-blue-primary"
                        aria-label="Edit entry"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEntry(entry)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink2 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink2">
                    {entry.content.length > 100
                      ? `${entry.content.slice(0, 100)}…`
                      : entry.content}
                  </p>
                  <p className="mt-2 font-mono text-[11px] uppercase text-ink3">
                    {formatDate(entry.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* RIGHT — Ask the Brain */}
        <Card className="flex h-[70vh] flex-col lg:h-auto lg:min-h-[640px]">
          <div className="flex items-center gap-2 border-b border-blue-border pb-3">
            <Sparkles className="h-5 w-5 text-gold" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-ink">Ask the Brain</h2>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="max-w-xs text-sm text-ink2">
                  Ask anything about your business — pricing, processes, policies,
                  product specs...
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border border-blue-border bg-blue-pale px-3 py-1.5 text-xs font-semibold text-blue-primary hover:bg-blue-light"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((turn, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    turn.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      turn.role === "user"
                        ? "bg-blue-primary text-white"
                        : "bg-blue-pale text-ink",
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{turn.content}</p>
                    {turn.role === "assistant" && turn.sources && turn.sources.length > 0 ? (
                      <div className="mt-2 border-t border-blue-border pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenSources(openSources === index ? null : index)
                          }
                          className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase text-blue-primary"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition",
                              openSources === index && "rotate-180",
                            )}
                            aria-hidden="true"
                          />
                          Sources used ({turn.sources.length})
                        </button>
                        {openSources === index ? (
                          <ul className="mt-2 space-y-1">
                            {turn.sources.map((source) => (
                              <li key={source.id} className="text-xs text-ink2">
                                • {source.title}{" "}
                                <span className="text-ink3">({label(source.category)})</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {asking ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-blue-pale px-4 py-3">
                  <Spinner className="h-4 w-4" />
                </div>
              </div>
            ) : null}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
            className="flex gap-2 border-t border-blue-border pt-3"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask the Brain a question..."
              disabled={asking}
            />
            <Button type="submit" disabled={asking || !question.trim()} className="px-3">
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </Card>
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit entry" : "Add knowledge entry"}
        description="This text is what the AI reads to answer questions."
      >
        <form onSubmit={saveEntry} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Wholesale payment terms"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Category</label>
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {label(cat)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write the full details the AI should know..."
              required
              rows={7}
              className="w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink3 focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : null}
              {editing ? "Save changes" : "Add entry"}
            </Button>
          </div>
        </form>
      </Modal>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
