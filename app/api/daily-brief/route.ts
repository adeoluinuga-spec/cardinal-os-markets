import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboardData";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

function startOfTodayIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function stripBriefPrefix(content: string) {
  return content.replace(/^DAILY_BRIEF(?::[a-z_]+)?:\s*/i, "").trim();
}

function fallbackBrief(
  tenantName: string,
  stats: {
    todaysRevenue: number;
    ordersToday: number;
    outstanding: number;
    activeCustomers: number;
  },
) {
  return `${tenantName} has recorded ${formatCurrency(stats.todaysRevenue)} from ${stats.ordersToday} orders today, with ${stats.activeCustomers} customers active in the last 90 days. Outstanding payments are currently ${formatCurrency(stats.outstanding)}, so cash collection should stay visible today. Recommended action: follow up on the largest unpaid or partial orders before closing.`;
}

export async function GET() {
  const { tenant, role } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const todayIso = startOfTodayIso();
  const normalizedRole = role ?? "member";

  const { data: existingBrief } = await supabase
    .from("ai_conversations")
    .select("content")
    .eq("tenant_id", normalizedTenant.id)
    .eq("role", "assistant")
    .like("content", `DAILY_BRIEF:${normalizedRole}:%`)
    .gte("created_at", todayIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingBrief?.content) {
    return NextResponse.json({ brief: stripBriefPrefix(existingBrief.content) });
  }

  const { stats } = await getDashboardData(supabase, normalizedTenant.id);
  const date = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "full",
  }).format(new Date());
  const businessType = normalizedTenant.business_type ?? "general trade";
  const city = normalizedTenant.city ?? "Lagos";
  const roleFocus: Record<string, string> = {
    ceo: "Focus on overall revenue, payments, team priorities, and risks.",
    owner: "Focus on overall revenue, payments, team priorities, and risks.",
    admin: "Focus on operational control, exceptions, and team follow-up.",
    sales_agent: "Focus on customers, quotes, orders, and follow-up actions.",
    warehouse: "Focus on confirmed orders, production, packaging, dispatch, and stock.",
    logistics: "Focus on packaged orders, dispatch, delivery confirmation, and stock movement.",
    finance: "Focus on outstanding payments, pending confirmations, and cash collection.",
  };
  const prompt = `You are the AI business assistant for ${normalizedTenant.name}, a ${businessType} business in ${city}. Today is ${date}. The current user's role is ${normalizedRole}. ${roleFocus[normalizedRole] ?? "Focus on the most useful action for this role."} Business summary: revenue today ${formatCurrency(stats.todaysRevenue)}, orders today ${stats.ordersToday}, outstanding payments ${formatCurrency(stats.outstanding)}, ${stats.activeCustomers} customers active. Write a 3-sentence morning brief. Be specific. End with one recommended action.`;

  let brief = fallbackBrief(normalizedTenant.name, stats);

  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 220,
      temperature: 0.4,
      system: prompt,
      messages: [
        {
          role: "user",
          content: "Generate today's morning brief.",
        },
      ],
    });
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();

    if (text) {
      brief = text;
    }
  }

  await supabase.from("ai_conversations").insert({
    tenant_id: normalizedTenant.id,
    role: "assistant",
    content: `DAILY_BRIEF:${normalizedRole}: ${brief}`,
    session_id: `daily-brief-${normalizedRole}-${new Date().toISOString().slice(0, 10)}`,
  });

  return NextResponse.json({ brief });
}
