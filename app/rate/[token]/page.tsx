"use client";

import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function RatingPage({ params }: { params: { token: string } }) {
  const [score, setScore] = useState(10);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/ratings/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token, score, comment }),
    });
    if (response.ok) setDone(true);
  }

  return (
    <main className="min-h-screen bg-blue-pale px-4 py-10">
      <Card className="mx-auto max-w-md">
        {done ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-light text-green">✓</div>
            <h1 className="mt-4 font-display text-3xl font-bold text-ink">Thank you</h1>
            <p className="mt-2 text-ink2">Your rating has been recorded.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex items-center gap-2 text-blue-primary">
              <Star className="h-5 w-5" />
              <span className="font-mono text-xs font-bold uppercase">Cardinal OS Markets</span>
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold text-ink">Rate your experience</h1>
            <p className="mt-2 text-sm text-ink2">How likely are you to recommend this business?</p>
            <input type="range" min={1} max={10} value={score} onChange={(event) => setScore(Number(event.target.value))} className="mt-6 w-full accent-blue-primary" />
            <p className="mt-2 text-center font-display text-5xl font-bold text-blue-primary">{score}</p>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional comment" className="mt-5 min-h-28 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light" />
            <Button type="submit" className="mt-5 w-full">Submit Rating</Button>
          </form>
        )}
      </Card>
    </main>
  );
}
