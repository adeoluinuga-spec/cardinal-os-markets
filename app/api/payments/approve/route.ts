import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { payment_id, action } = await request.json();
  const supabase = await createServerSupabaseClient();
  const { data: payment, error } = await supabase.from("payments").select("*, order:orders(*)").eq("tenant_id", t.id).eq("id", payment_id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (action === "reject") {
    await supabase.from("payments").update({ status: "rejected", verified_by: user.id, verified_at: new Date().toISOString() }).eq("id", payment_id);
    return NextResponse.json({ message: "Payment rejected." });
  }
  await supabase.from("payments").update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() }).eq("id", payment_id);
  if (action === "verify_only") {
    return NextResponse.json({ message: "Payment verified. Balance not applied yet." });
  }
  if (payment.order_id) {
    const order = Array.isArray(payment.order) ? payment.order[0] : payment.order;
    const amountPaid = Number(order.amount_paid ?? 0) + Number(payment.amount ?? 0);
    const total = Number(order.total ?? 0);
    const balance = Math.max(0, total - amountPaid);
    const update: Record<string, unknown> = {
      amount_paid: amountPaid,
      balance,
      payment_status: balance <= 0 ? "paid" : "partial",
    };
    if (balance <= 0 && order.status === "awaiting_payment") update.status = "confirmed";
    await supabase.from("orders").update(update).eq("tenant_id", t.id).eq("id", payment.order_id);
  }
  return NextResponse.json({ message: "Payment approved and applied to the order." });
}
