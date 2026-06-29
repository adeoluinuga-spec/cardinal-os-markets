import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

function isFinanceAllowed(role: string | null) {
  return ["ceo", "owner", "admin", "finance"].includes(role ?? "");
}

export async function GET(request: Request) {
  const { tenant, role } = await getCurrentUserWithTenant();

  if (!tenant || !isFinanceAllowed(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const search = params.get("search")?.trim();
  const dateFrom = params.get("from");
  const dateTo = params.get("to");
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("payments")
    .select("*, order:orders(id, order_number, customer_name, total, amount_paid, balance, status)")
    .eq("tenant_id", t.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const payments = data ?? [];
  const submitterIds = Array.from(new Set(payments.map((payment) => payment.submitted_by).filter(Boolean)));
  const { data: users } = submitterIds.length
    ? await supabase.from("tenant_users").select("user_id, full_name, role").eq("tenant_id", t.id).in("user_id", submitterIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((user) => [user.user_id, user]));
  const enriched = payments.map((payment) => ({
    ...payment,
    submitted_by_user: payment.submitted_by ? userMap.get(payment.submitted_by) ?? null : null,
  }));
  const filtered = search
    ? enriched.filter((payment) => {
        const order = Array.isArray(payment.order) ? payment.order[0] : payment.order;
        return (
          String(payment.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
          String(order?.customer_name ?? "").toLowerCase().includes(search.toLowerCase())
        );
      })
    : enriched;

  return NextResponse.json({ payments: filtered });
}
