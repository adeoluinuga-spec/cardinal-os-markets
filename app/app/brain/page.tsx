"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Result = { title: string; source: string; excerpt: string };

export default function BrainPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/brain/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    setResults(data.results ?? []);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Company Brain" subtitle="Keyword fallback search across customers, products, and orders until deeper embeddings are added." />
      <Card>
        <form onSubmit={search} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, customer, SKU, order number..." required />
          <Button type="submit"><Search className="h-4 w-4" /> Search</Button>
        </form>
      </Card>
      <div className="space-y-3">
        {results.map((result, index) => (
          <Card key={`${result.source}-${index}`}>
            <p className="font-semibold text-ink">{result.title}</p>
            <p className="mt-1 font-mono text-xs uppercase text-blue-primary">{result.source}</p>
            <p className="mt-2 text-sm text-ink2">{result.excerpt}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
