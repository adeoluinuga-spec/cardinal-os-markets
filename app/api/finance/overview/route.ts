import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

function isFinanceAllowed(role: string | null) {
  return ["owner", "admin", "finance"].includes(role ?? "");
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-NG", { weekday: "short" }).format(date);
}

export async function GET() {
  const { tenant, role } = await getCurrentUserWithTenant();

  if (!tenant || !isFinanceAllowed(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = startOfDay(new Date(Date.now() - 6 * 86_400_000));

  const [paidOrders, allOrders, monthPaidOrders, openOrders, verifiedPayments] = await Promise.all([
    supabase.from("orders").select("total, created_at").eq("tenant_id", t.id).eq("payment_status", "paid"),
    supabase.from("orders").select("payment_status").eq("tenant_id", t.id),
    supabase.from("orders").select("total").eq("tenant_id", t.id).eq("payment_status", "paid").gte("created_at", monthStart.toISOString()),
    supabase.from("orders").select("id, order_number, customer_name, total, amount_paid, balance, created_at").eq("tenant_id", t.id).neq("payment_status", "paid").order("created_at", { ascending: true }),
    supabase.from("payments").select("*, order:orders(order_number, customer_name)").eq("tenant_id", t.id).eq("status", "verified").order("verified_at", { ascending: false }).limit(20),
  ]);

  const paidOrderRows = paidOrders.data ?? [];
  const totalOrders = allOrders.data?.length ?? 0;
  const paidCount = allOrders.data?.filter((order) => order.payment_status === "paid").length ?? 0;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(new Date(sevenDaysAgo.getTime() + index * 86_400_000));
    const nextDate = new Date(date.getTime() + 86_400_000);
    const revenue = paidOrderRows
      .filter((order) => {
        const created = new Date(order.created_at ?? 0).getTime();
        return created >= date.getTime() && created < nextDate.getTime();
      })
      .reduce((sum, order) => sum + Number(order.total ?? 0), 0);
    return { day: dayLabel(date), date: date.toISOString().slice(0, 10), revenue };
  });

  return NextResponse.json({
    stats: {
      totalRevenue: paidOrderRows.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
      monthRevenue: (monthPaidOrders.data ?? []).reduce((sum, order) => sum + Number(order.total ?? 0), 0),
      outstanding: (openOrders.data ?? []).reduce((sum, order) => sum + Number(order.balance ?? 0), 0),
      collectionRate: totalOrders > 0 ? Math.round((paidCount / totalOrders) * 100) : 0,
    },
    chart: days,
    transactions: verifiedPayments.data ?? [],
    unpaidOrders: openOrders.data ?? [],
  });
}
