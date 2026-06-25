import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = await request.json();
  const supabase = await createServerSupabaseClient();
  const { data: pending } = await supabase.from("payments").select("id").eq("tenant_id", t.id).eq("order_id", body.order_id).eq("status", "pending").maybeSingle();
  if (pending) return NextResponse.json({ error: "A payment is already awaiting approval for this order." }, { status: 400 });
  const { error } = await supabase.from("payments").insert({
    tenant_id: t.id, order_id: body.order_id, amount: Number(body.amount), channel: body.channel,
    reference: body.reference || crypto.randomUUID(), payer_name: body.payer_name || null,
    bank_name: body.bank_name || null, proof_url: body.proof_url || null,
    status: "pending", submitted_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
