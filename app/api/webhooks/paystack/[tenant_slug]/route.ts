import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptTenantSecret } from "@/lib/tenantPaystack";

type RouteContext = {
  params: {
    tenant_slug: string;
  };
};

type PaystackWebhook = {
  event?: string;
  data?: {
    amount?: number;
    reference?: string;
    status?: string;
    metadata?: {
      order_id?: string;
      tracking_token?: string;
      tenant_id?: string;
    };
  };
};

function verifySignature(rawBody: string, signature: string, secret: string) {
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

async function applyVerifiedPayment({
  tenantId,
  orderId,
  reference,
  amountNaira,
}: {
  tenantId: string;
  orderId: string;
  reference: string;
  amountNaira: number;
}) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("reference", reference)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin.from("payments").insert({
      tenant_id: tenantId,
      order_id: order.id,
      reference,
      amount: amountNaira,
      channel: "paystack",
      status: "verified",
      verified_at: new Date().toISOString(),
    });
  }

  const amountPaid = Number(order.amount_paid ?? 0) + amountNaira;
  const total = Number(order.total ?? 0);
  const balance = Math.max(0, total - amountPaid);
  const paymentStatus = amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : "unpaid";
  const update: Record<string, unknown> = {
    amount_paid: amountPaid,
    balance,
    payment_status: paymentStatus,
  };

  if (
    paymentStatus === "paid" &&
    (order.status === "quote" || order.status === "awaiting_payment")
  ) {
    update.status = "confirmed";
  }

  await supabaseAdmin
    .from("orders")
    .update(update)
    .eq("tenant_id", tenantId)
    .eq("id", order.id);

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("id, slug, paystack_webhook_secret")
    .eq("slug", params.tenant_slug)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  if (!tenant.paystack_webhook_secret) {
    return NextResponse.json(
      { error: "Tenant Paystack webhook secret is not configured." },
      { status: 500 },
    );
  }

  const webhookSecret = decryptTenantSecret(tenant.paystack_webhook_secret);
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Tenant Paystack webhook secret is not configured." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  const body = JSON.parse(rawBody) as PaystackWebhook;
  const event = (body.event ?? "").toLowerCase();
  if (event !== "charge.success") {
    return NextResponse.json({ ignored: true });
  }

  if (body.data?.status && body.data.status !== "success") {
    return NextResponse.json({ ignored: true });
  }

  const reference = body.data?.reference;
  const amountNaira = Number(body.data?.amount ?? 0) / 100;
  const metadata = body.data?.metadata;

  if (!reference || !metadata?.order_id) {
    return NextResponse.json(
      { error: "Missing order payment metadata." },
      { status: 400 },
    );
  }

  if (metadata.tenant_id && metadata.tenant_id !== tenant.id) {
    return NextResponse.json({ error: "Tenant metadata mismatch." }, { status: 403 });
  }

  return applyVerifiedPayment({
    tenantId: tenant.id,
    orderId: metadata.order_id,
    reference,
    amountNaira,
  });
}
