import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as {
    order_id?: string;
    amount?: number;
    reference?: string;
    reference_number?: string;
    channel?: string;
    payer_name?: string;
    bank_name?: string;
    proof_url?: string;
    proof_hash?: string;
  };
  const supabase = await createServerSupabaseClient();

  if (!body.order_id) {
    return NextResponse.json({ error: "Select an unpaid order." }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, balance, payment_status")
    .eq("tenant_id", t.id)
    .eq("id", body.order_id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const amount = Number(body.amount ?? 0);
  const balance = Number(order.balance ?? 0);

  if (amount <= 0) {
    return NextResponse.json({ error: "Enter a payment amount." }, { status: 400 });
  }

  if (balance <= 0 || order.payment_status === "paid") {
    return NextResponse.json(
      { error: "This order is already fully paid." },
      { status: 400 },
    );
  }

  if (amount > balance) {
    return NextResponse.json(
      {
        error: `Amount cannot exceed the outstanding balance of ₦${balance.toLocaleString("en-NG")}.`,
      },
      { status: 400 },
    );
  }

  const reference = body.reference?.trim() || body.reference_number?.trim();

  if (!reference) {
    return NextResponse.json(
      { error: "Reference number is required." },
      { status: 400 },
    );
  }

  if (!body.proof_url) {
    return NextResponse.json(
      { error: "Upload proof of payment before submitting." },
      { status: 400 },
    );
  }

  const { data: pending } = await supabase.from("payments").select("id").eq("tenant_id", t.id).eq("order_id", body.order_id).eq("status", "pending").maybeSingle();
  if (pending) return NextResponse.json({ error: "A payment is already awaiting approval for this order." }, { status: 400 });
  const { error } = await supabase.from("payments").insert({
    tenant_id: t.id, order_id: body.order_id, amount, channel: body.channel,
    reference, payer_name: body.payer_name || null,
    bank_name: body.bank_name || null, proof_url: body.proof_url || null,
    proof_hash: body.proof_hash || null,
    status: "pending", submitted_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
