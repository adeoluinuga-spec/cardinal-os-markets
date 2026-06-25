import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardStats = {
  todaysRevenue: number;
  ordersToday: number;
  outstanding: number;
  activeCustomers: number;
};

export type RecentOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  channel: string | null;
  total: number | null;
  status: string | null;
  created_at: string | null;
};

export type LowStockProduct = {
  id: string;
  name: string;
  stock_quantity: number | null;
  reorder_point: number | null;
};

export type DashboardData = {
  stats: DashboardStats;
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
};

function startOfTodayIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function ninetyDaysAgoIso() {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date.toISOString();
}

function sum(values: (number | null)[]): number {
  return values.reduce<number>(
    (total, value) => total + Number(value ?? 0),
    0,
  );
}

export async function getDashboardData(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<DashboardData> {
  const todayIso = startOfTodayIso();
  const activeSinceIso = ninetyDaysAgoIso();

  const [
    paidOrdersToday,
    ordersToday,
    outstandingOrders,
    activeCustomers,
    recentOrders,
    products,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total")
      .eq("tenant_id", tenantId)
      .eq("payment_status", "paid")
      .gte("created_at", todayIso),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
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
      .gte("last_order_at", activeSinceIso),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, channel, total, status, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("products")
      .select("id, name, stock_quantity, reorder_point")
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
  ]);

  const lowStockProducts = ((products.data ?? []) as LowStockProduct[])
    .filter(
      (product) =>
        Number(product.stock_quantity ?? 0) <= Number(product.reorder_point ?? 0),
    )
    .slice(0, 6);

  return {
    stats: {
      todaysRevenue: sum(
        ((paidOrdersToday.data ?? []) as { total: number | null }[]).map(
          (order) => order.total,
        ),
      ),
      ordersToday: ordersToday.count ?? 0,
      outstanding: sum(
        ((outstandingOrders.data ?? []) as { balance: number | null }[]).map(
          (order) => order.balance,
        ),
      ),
      activeCustomers: activeCustomers.count ?? 0,
    },
    recentOrders: (recentOrders.data ?? []) as RecentOrder[],
    lowStockProducts,
  };
}
