import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: { token: string } };

export async function POST(request: Request, { params }: RouteContext) {
  const { reference } = (await request.json()) as { reference?: string };
  if (!reference) {
    return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Paystack is not configured." }, { status: 500 });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("tracking_token", params.token)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const verifyJson = (await verifyRes.json()) as {
    status?: boolean;
    data?: { status?: string; amount?: number; reference?: string };
  };

  if (!verifyJson.status || verifyJson.data?.status !== "success") {
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 402 });
  }

  const amountNaira = Number(verifyJson.data.amount ?? 0) / 100;
  const expectedBalance = Number(order.balance ?? 0);
  if (amountNaira < expectedBalance) {
    return NextResponse.json({ error: "Payment amount is less than the balance due." }, { status: 400 });
  }

  const amountPaid = Number(order.amount_paid ?? 0) + amountNaira;
  const total = Number(order.total ?? 0);
  const balance = Math.max(0, total - amountPaid);
  const paymentStatus = amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : "unpaid";

  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("tenant_id", order.tenant_id)
    .eq("reference", reference)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin.from("payments").insert({
      tenant_id: order.tenant_id,
      order_id: order.id,
      reference,
      amount: amountNaira,
      channel: "paystack",
      status: "verified",
      verified_at: new Date().toISOString(),
    });
  }

  const update: Record<string, unknown> = {
    amount_paid: amountPaid,
    balance,
    payment_status: paymentStatus,
  };
  if (paymentStatus === "paid" && order.status === "awaiting_payment") {
    update.status = "confirmed";
  }

  await supabaseAdmin.from("orders").update(update).eq("id", order.id);

  return NextResponse.json({ message: "Payment received. Thank you!" });
}
