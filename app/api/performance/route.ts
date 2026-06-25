import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function GET(request: Request) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant || !["owner", "admin"].includes(role ?? "")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const supabase = await createServerSupabaseClient();
  const { data: users } = await supabase.from("tenant_users").select("*").eq("tenant_id", t.id).eq("is_active", true);
  const rows = await Promise.all((users ?? []).map(async (u) => {
    const [orders, customers, payments, tasks] = await Promise.all([
      supabase.from("orders").select("total").eq("tenant_id", t.id).eq("created_by", u.user_id).gte("created_at", since),
      supabase.from("customers").select("id").eq("tenant_id", t.id).eq("assigned_to", u.user_id),
      supabase.from("payments").select("status").eq("tenant_id", t.id).eq("submitted_by", u.user_id).gte("created_at", since),
      supabase.from("tasks").select("id").eq("tenant_id", t.id).eq("assigned_to", u.user_id).eq("status", "complete").gte("created_at", since),
    ]);
    return {
      user: u,
      orders_created: orders.data?.length ?? 0,
      order_value: (orders.data ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0),
      customers_managed: customers.data?.length ?? 0,
      payments_submitted: payments.data?.length ?? 0,
      payments_verified: payments.data?.filter((p) => p.status === "verified").length ?? 0,
      tasks_completed: tasks.data?.length ?? 0,
    };
  }));
  return NextResponse.json({ rows });
}
