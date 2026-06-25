import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { daysSince } from "@/lib/customerHealth";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as { customer_id?: string };

  if (!body.customer_id) {
    return NextResponse.json(
      { error: "customer_id is required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", body.customer_id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("order_number, total, status, created_at")
    .eq("tenant_id", normalizedTenant.id)
    .eq("customer_id", body.customer_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const lastOrderDays = daysSince(customer.last_order_at);
  const prompt = `Summarise this customer account in 2 sentences and give one specific recommended action. Customer: ${customer.full_name}, Type: ${customer.customer_type}, LTV: ${formatCurrency(customer.lifetime_value)}, Orders: ${customer.total_orders}, Last order: ${lastOrderDays ?? "unknown"} days ago, Health: ${customer.health_score}/100`;
  let summary = `${customer.full_name} is a ${customer.customer_type} customer with ${formatCurrency(customer.lifetime_value)} lifetime value and ${customer.total_orders ?? 0} total orders. Recommended action: reach out with a relevant offer based on their most recent buying pattern.`;

  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 180,
      temperature: 0.35,
      messages: [
        {
          role: "user",
          content: `${prompt}\nRecent orders: ${JSON.stringify(orders ?? [])}`,
        },
      ],
    });
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();

    if (text) {
      summary = text;
    }
  }

  return NextResponse.json({ summary });
}
