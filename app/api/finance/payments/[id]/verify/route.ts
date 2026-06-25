import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

type RouteContext = { params: { id: string } };

function isVerifier(role: string | null) {
  return ["owner", "admin", "finance"].includes(role ?? "");
}

function dayBounds(value: string | null) {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  const end = new Date(date.getTime() + 86_400_000);
  return { start: date.toISOString(), end: end.toISOString() };
}

export async function POST(request: Request, { params }: RouteContext) {
  const { tenant, role, user } = await getCurrentUserWithTenant();

  if (!tenant || !user || !isVerifier(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json().catch(() => ({}))) as { confirmSoftDuplicate?: boolean };
  const supabase = await createServerSupabaseClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*, order:orders(*)")
    .eq("tenant_id", t.id)
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (payment.status === "verified") return NextResponse.json({ message: "Payment already verified." });

  const { data: duplicate } = await supabase
    .from("payments")
    .select("id, reference, verified_at, order:orders(order_number)")
    .eq("tenant_id", t.id)
    .eq("reference", payment.reference)
    .eq("status", "verified")
    .neq("id", params.id)
    .maybeSingle();

  if (duplicate) {
    const order = Array.isArray(duplicate.order) ? duplicate.order[0] : duplicate.order;
    const date = duplicate.verified_at ? new Date(duplicate.verified_at).toLocaleDateString("en-NG") : "an earlier date";
    return NextResponse.json(
      {
        error: `This reference was already verified for Order ${order?.order_number ?? "another order"} on ${date}. This payment cannot be verified.`,
      },
      { status: 409 },
    );
  }

  const bounds = dayBounds(payment.created_at);
  const { data: softDuplicate } = await supabase
    .from("payments")
    .select("id, amount, reference, verified_at")
    .eq("tenant_id", t.id)
    .eq("status", "verified")
    .eq("amount", payment.amount)
    .neq("reference", payment.reference)
    .gte("created_at", bounds.start)
    .lt("created_at", bounds.end)
    .limit(1)
    .maybeSingle();

  if (softDuplicate && !body.confirmSoftDuplicate) {
    return NextResponse.json(
      {
        warning: true,
        message: `A payment of ₦${Number(payment.amount ?? 0).toLocaleString("en-NG")} was already verified today. Are you sure this is a different payment? Click Confirm to proceed.`,
      },
      { status: 409 },
    );
  }

  const order = Array.isArray(payment.order) ? payment.order[0] : payment.order;
  const amountPaid = Number(order.amount_paid ?? 0) + Number(payment.amount ?? 0);
  const total = Number(order.total ?? 0);
  const balance = Math.max(0, total - amountPaid);
  const paymentStatus = amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : "unpaid";
  const orderUpdate: Record<string, unknown> = {
    amount_paid: amountPaid,
    balance,
    payment_status: paymentStatus,
  };
  if (paymentStatus === "paid" && order.status === "awaiting_payment") {
    orderUpdate.status = "confirmed";
  }

  const [{ error: paymentError }, { error: orderError }] = await Promise.all([
    supabase.from("payments").update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() }).eq("tenant_id", t.id).eq("id", params.id),
    supabase.from("orders").update(orderUpdate).eq("tenant_id", t.id).eq("id", payment.order_id),
  ]);

  if (paymentError || orderError) {
    return NextResponse.json({ error: paymentError?.message ?? orderError?.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Payment verified and applied to the order." });
}
