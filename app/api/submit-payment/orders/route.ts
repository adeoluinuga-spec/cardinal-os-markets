import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function GET() {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", t.id)
    .gt("balance", 0)
    .in("payment_status", ["unpaid", "partial"])
    .order("created_at", { ascending: false });
  const { data: payments } = await supabase.from("payments").select("*").eq("tenant_id", t.id).eq("submitted_by", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ orders: orders ?? [], payments: payments ?? [] });
}
