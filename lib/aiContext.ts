import type { SupabaseClient } from "@supabase/supabase-js";

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function naira(value: number | null | undefined) {
  return `₦${Number(value ?? 0).toLocaleString("en-NG")}`;
}

/**
 * Compact live-business context for the Company Brain: a few recent orders and
 * the current low-stock list. Returns a plain-text block for the system prompt.
 */
export async function getBrainLiveContext(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const [recentOrders, products] = await Promise.all([
    supabase
      .from("orders")
      .select("order_number, customer_name, total, status, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("products")
      .select("name, stock_quantity, reorder_point")
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
  ]);

  const orders = (recentOrders.data ?? []) as {
    order_number: string;
    customer_name: string;
    total: number | null;
    status: string | null;
  }[];
  const lowStock = ((products.data ?? []) as {
    name: string;
    stock_quantity: number | null;
    reorder_point: number | null;
  }[])
    .filter(
      (p) => Number(p.stock_quantity ?? 0) <= Number(p.reorder_point ?? 0),
    )
    .slice(0, 8);

  const ordersText = orders.length
    ? orders
        .map(
          (o) =>
            `- ${o.order_number} · ${o.customer_name} · ${naira(o.total)} · ${o.status}`,
        )
        .join("\n")
    : "- No recent orders.";
  const stockText = lowStock.length
    ? lowStock
        .map((p) => `- ${p.name}: ${p.stock_quantity ?? 0} left (reorder at ${p.reorder_point ?? 0})`)
        .join("\n")
    : "- No products are low on stock.";

  return `RECENT ORDERS:\n${ordersText}\n\nLOW STOCK:\n${stockText}`;
}

/**
 * Full live-business snapshot for the AI Assistant: revenue, pipeline,
 * outstanding payments, at-risk customers, low stock and top customers.
 */
export async function getAssistantLiveContext(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const todayIso = startOfTodayIso();
  const monthIso = startOfMonthIso();

  const [paidToday, ordersToday, outstanding, atRisk, products, monthOrders] =
    await Promise.all([
      supabase
        .from("orders")
        .select("total")
        .eq("tenant_id", tenantId)
        .eq("payment_status", "paid")
        .gte("created_at", todayIso),
      supabase
        .from("orders")
        .select("status")
        .eq("tenant_id", tenantId)
        .gte("created_at", todayIso),
      supabase
        .from("orders")
        .select("balance")
        .eq("tenant_id", tenantId)
        .in("payment_status", ["unpaid", "partial"]),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .lt("health_score", 40),
      supabase
        .from("products")
        .select("name, stock_quantity, reorder_point")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      supabase
        .from("orders")
        .select("customer_name, total")
        .eq("tenant_id", tenantId)
        .gte("created_at", monthIso),
    ]);

  const revenueToday = ((paidToday.data ?? []) as { total: number | null }[]).reduce(
    (sum, o) => sum + Number(o.total ?? 0),
    0,
  );

  const todays = (ordersToday.data ?? []) as { status: string | null }[];
  const pipeline = {
    quote: todays.filter((o) => o.status === "quote").length,
    confirmed: todays.filter((o) => o.status === "confirmed").length,
    dispatched: todays.filter((o) => o.status === "dispatched").length,
  };

  const outstandingTotal = ((outstanding.data ?? []) as { balance: number | null }[]).reduce(
    (sum, o) => sum + Number(o.balance ?? 0),
    0,
  );

  const lowStock = ((products.data ?? []) as {
    name: string;
    stock_quantity: number | null;
    reorder_point: number | null;
  }[])
    .filter((p) => Number(p.stock_quantity ?? 0) <= Number(p.reorder_point ?? 0))
    .slice(0, 10);

  const totalsByCustomer = new Map<string, number>();
  for (const o of (monthOrders.data ?? []) as {
    customer_name: string;
    total: number | null;
  }[]) {
    totalsByCustomer.set(
      o.customer_name,
      (totalsByCustomer.get(o.customer_name) ?? 0) + Number(o.total ?? 0),
    );
  }
  const topCustomers = Array.from(totalsByCustomer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lowStockText = lowStock.length
    ? lowStock.map((p) => `${p.name} (${p.stock_quantity ?? 0} left)`).join(", ")
    : "none";
  const topCustomersText = topCustomers.length
    ? topCustomers.map(([name, total]) => `${name} (${naira(total)})`).join(", ")
    : "none yet this month";

  return [
    `- Revenue today: ${naira(revenueToday)}`,
    `- Orders today: ${todays.length} (pipeline: ${pipeline.quote} quote, ${pipeline.confirmed} confirmed, ${pipeline.dispatched} dispatched)`,
    `- Outstanding payments: ${naira(outstandingTotal)}`,
    `- Customers at risk (health < 40): ${atRisk.count ?? 0}`,
    `- Low stock products: ${lowStockText}`,
    `- Top customers this month: ${topCustomersText}`,
  ].join("\n");
}
