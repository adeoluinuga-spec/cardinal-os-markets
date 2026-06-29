import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type TenantBriefInput = {
  tenant_id: string;
  sentForDate?: string;
  frequency?: "daily" | "weekly";
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayRange(dateText?: string) {
  const start = dateText ? new Date(`${dateText}T00:00:00.000Z`) : new Date();
  if (!dateText) start.setUTCDate(start.getUTCDate() - 1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function fallbackBrief({
  tenantName,
  revenue,
  orders,
  pending,
  atRisk,
  lowStock,
  frequency,
}: {
  tenantName: string;
  revenue: number;
  orders: number;
  pending: number;
  atRisk: number;
  lowStock: string[];
  frequency: "daily" | "weekly";
}) {
  const label = frequency === "weekly" ? "week" : "yesterday";
  const stockLine = lowStock.length ? ` Low stock: ${lowStock.join(", ")}.` : "";
  return `Good morning ${tenantName}. ${label} closed at ${money(revenue)} from ${orders} orders, with ${money(pending)} still pending. ${atRisk} customers need attention.${stockLine} Action: follow up your largest unpaid order today.`;
}

export async function generateTenantBrief({
  tenant_id,
  sentForDate,
  frequency = "daily",
}: TenantBriefInput) {
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("id, name, business_type, city")
    .eq("id", tenant_id)
    .maybeSingle();

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? "Tenant not found.");
  }

  const { start, end } = dayRange(sentForDate);
  if (frequency === "weekly") {
    start.setUTCDate(start.getUTCDate() - 6);
  }

  const [{ data: paidOrders }, { data: allOrders }, { data: newCustomers }, { count: atRiskCount }, { data: lowStockProducts }] =
    await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("total")
        .eq("tenant_id", tenant_id)
        .eq("payment_status", "paid")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      supabaseAdmin
        .from("orders")
        .select("id, balance")
        .eq("tenant_id", tenant_id)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      supabaseAdmin
        .from("customers")
        .select("id")
        .eq("tenant_id", tenant_id)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      supabaseAdmin
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant_id)
        .lt("health_score", 40),
      supabaseAdmin
        .from("products")
        .select("name, stock_quantity, reorder_point")
        .eq("tenant_id", tenant_id)
        .gt("stock_quantity", 0)
        .limit(100),
    ]);

  const revenue = (paidOrders ?? []).reduce(
    (sum, order) => sum + Number(order.total ?? 0),
    0,
  );
  const orders = allOrders?.length ?? 0;
  const pending = (allOrders ?? []).reduce(
    (sum, order) => sum + Number(order.balance ?? 0),
    0,
  );
  const lowStock = (lowStockProducts ?? [])
    .filter(
      (product) =>
        Number(product.stock_quantity ?? 0) <= Number(product.reorder_point ?? 0),
    )
    .slice(0, 5)
    .map((product) => `${product.name} (${product.stock_quantity})`);
  const dataSummary = {
    revenue,
    orders,
    pending,
    newCustomers: newCustomers?.length ?? 0,
    atRisk: atRiskCount ?? 0,
    lowStock,
  };

  let brief = fallbackBrief({
    tenantName: tenant.name,
    revenue,
    orders,
    pending,
    atRisk: dataSummary.atRisk,
    lowStock,
    frequency,
  });

  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 120,
      temperature: 0.4,
      system: `You are the AI assistant for ${tenant.name}, a ${tenant.business_type ?? "general trade"} business. Write a short, warm WhatsApp ${frequency === "weekly" ? "weekly" : "morning"} brief (max 60 words). Use the data below. Be encouraging but honest. Include ONE specific action they should take today. Use minimal emoji (1-2 max).`,
      messages: [
        {
          role: "user",
          content: `Data:
Revenue ${frequency === "weekly" ? "this week" : "yesterday"}: ${money(revenue)}
Orders: ${orders}
Pending payments: ${money(pending)}
New customers: ${dataSummary.newCustomers}
At-risk customers: ${dataSummary.atRisk}
Low stock: ${lowStock.length ? lowStock.join(", ") : "None"}`,
        },
      ],
    });
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();
    if (text) brief = text;
  }

  return {
    tenant,
    sentForDate: sentForDate ?? isoDate(dayRange().start),
    message: brief,
    data: dataSummary,
  };
}
