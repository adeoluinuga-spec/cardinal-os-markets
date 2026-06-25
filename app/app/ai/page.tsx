"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What should I focus on today?",
  "Which customers need follow-up?",
  "Draft a payment reminder",
  "What's selling best this week?",
  "Which products should I restock?",
];

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionRef = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "session",
  );
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    const history = messages;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setSending(true);
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, session_id: sessionRef.current }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: res.ok
          ? data.answer
          : data.message ?? data.error ?? "Something went wrong.",
      },
    ]);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl bg-blue-dark text-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <Bot className="h-5 w-5 text-blue-light" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-lg font-bold">AI Assistant</p>
          <p className="text-xs text-blue-light">
            Full live business context · powered by Claude
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
            <Sparkles className="h-8 w-8 text-gold" aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl font-bold">
              How can I help you run the business today?
            </h2>
            <p className="mt-2 text-sm text-blue-light">
              I can see today&apos;s revenue, your pipeline, outstanding payments,
              at-risk customers and stock levels.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-light transition hover:bg-white/10 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-blue-primary text-white"
                    : "bg-white/10 text-white",
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {sending ? (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl bg-white/10 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-light [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-light [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-light" />
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-white/10 px-4 py-3 sm:px-6"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message your AI assistant..."
          disabled={sending}
          className="h-11 flex-1 rounded-lg border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-blue-light/60 focus:border-blue-light focus:bg-white/10 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-primary text-white transition hover:bg-blue-mid disabled:pointer-events-none disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
