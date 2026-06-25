import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function POST() {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const [quotes, churn, lowStock, pending, outstanding] = await Promise.all([
    supabase.from("orders").select("*").eq("tenant_id", t.id).eq("status", "quote").lt("created_at", threeDaysAgo),
    supabase.from("customers").select("*").eq("tenant_id", t.id).lt("health_score", 40),
    supabase.from("products").select("*").eq("tenant_id", t.id).lte("stock_quantity", 999999),
    supabase.from("payments").select("*").eq("tenant_id", t.id).eq("status", "pending").lt("created_at", yesterday),
    supabase.from("orders").select("*").eq("tenant_id", t.id).gt("balance", 100000),
  ]);
  const context = {
    quotes_older_than_3_days: quotes.data ?? [],
    churn_risk_customers: churn.data ?? [],
    low_stock_products: (lowStock.data ?? []).filter((p) => Number(p.stock_quantity ?? 0) <= Number(p.reorder_point ?? 0)),
    pending_payments_over_24h: pending.data ?? [],
    outstanding_balances_over_100k: outstanding.data ?? [],
  };
  let actions = [
    { title: "Review stalled quotes", reason: "Some quotes may need follow-up.", priority: "medium" },
  ];
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest", max_tokens: 800,
      system: `You are a business advisor for ${t.name}. Review this business data and suggest 3-5 specific actions the owner should take today. For each action include: title, reason, priority (high/medium/low). Return JSON array only.`,
      messages: [{ role: "user", content: JSON.stringify(context) }],
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    actions = JSON.parse(text.replace(/```json|```/g, "").trim());
  }
  return NextResponse.json({ actions, context });
}
