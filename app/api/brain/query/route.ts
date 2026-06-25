import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";
import { getTierLimits, normalizeTier } from "@/lib/tiers";

type Result = { title: string; source: string; excerpt: string };

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { query } = (await request.json()) as { query?: string };
  const term = (query ?? "").trim();
  if (!term) return NextResponse.json({ results: [] });
  const supabase = await createServerSupabaseClient();

  // Enforce the monthly AI query limit (tracked in usage_tracking).
  const tier = normalizeTier(t.subscription_tier);
  const maxQueries = getTierLimits(tier).max_ai_queries_per_month;
  if (maxQueries !== -1) {
    const { data: usage } = await supabase.rpc("get_usage", {
      p_tenant_id: t.id,
      p_metric: "ai_queries",
    });
    if ((usage ?? 0) >= maxQueries) {
      const now = new Date();
      const resetsOn = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        .toISOString()
        .slice(0, 10);
      return NextResponse.json(
        {
          error: "USAGE_LIMIT_REACHED",
          message: `You have used all ${maxQueries} AI queries for this month. Upgrade to Growth or Professional for unlimited AI queries.`,
          limit: maxQueries,
          current: usage ?? 0,
          resets_on: resetsOn,
          upgrade_required: true,
        },
        { status: 403 },
      );
    }
  }
  await supabase.rpc("increment_usage", { p_tenant_id: t.id, p_metric: "ai_queries" });
  const like = `%${term}%`;
  const [customers, products, orders] = await Promise.all([
    supabase.from("customers").select("full_name, phone, email, customer_type, notes").eq("tenant_id", t.id).or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like},notes.ilike.${like}`).limit(8),
    supabase.from("products").select("name, sku, category, description, stock_quantity").eq("tenant_id", t.id).or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like},description.ilike.${like}`).limit(8),
    supabase.from("orders").select("order_number, status, channel, total_amount, notes").eq("tenant_id", t.id).or(`order_number.ilike.${like},status.ilike.${like},channel.ilike.${like},notes.ilike.${like}`).limit(8),
  ]);
  const results: Result[] = [
    ...(customers.data ?? []).map((customer) => ({ title: customer.full_name, source: "Customer", excerpt: `${customer.customer_type ?? "retail"} - ${customer.phone ?? customer.email ?? "No contact"} ${customer.notes ? `- ${customer.notes}` : ""}` })),
    ...(products.data ?? []).map((product) => ({ title: product.name, source: "Product", excerpt: `${product.sku ?? "No SKU"} - ${product.category ?? "Uncategorised"} - Stock ${product.stock_quantity ?? 0}` })),
    ...(orders.data ?? []).map((order) => ({ title: order.order_number, source: "Order", excerpt: `${order.status} - ${order.channel} - Total NGN ${Number(order.total_amount ?? 0).toLocaleString("en-NG")}` })),
  ];
  return NextResponse.json({ results, fallback: "keyword" });
}
