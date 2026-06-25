import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { order_id, code } = await request.json();
  const supabase = await createServerSupabaseClient();
  const { data: order } = await supabase.from("orders").select("pickup_code").eq("tenant_id", t.id).eq("id", order_id).single();
  if (!order || order.pickup_code !== code) return NextResponse.json({ error: "Wrong pickup code." }, { status: 400 });
  await supabase.from("orders").update({ status: "delivered", pickup_confirmed_at: new Date().toISOString() }).eq("tenant_id", t.id).eq("id", order_id);
  return NextResponse.json({ ok: true });
}
