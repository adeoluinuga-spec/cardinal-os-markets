import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as { delivery_id?: string; reason?: string };

  if (!body.delivery_id || !body.reason?.trim()) {
    return NextResponse.json(
      { error: "Delivery and reason are required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select("*, order:orders(id, notes)")
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", body.delivery_id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  await supabase
    .from("deliveries")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", body.delivery_id);
  await supabase
    .from("orders")
    .update({
      status: "delivered",
      notes: `${delivery.order?.notes ?? ""}\nManual delivery reason: ${body.reason}`.trim(),
    })
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", delivery.order_id);

  return NextResponse.json({ ok: true });
}
