import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PaystackWebhook = {
  event?: string;
  data?: {
    amount?: number;
    reference?: string;
    metadata?: {
      tenant_id?: string;
      tier?: string;
    };
    customer?: {
      email?: string;
      metadata?: {
        tenant_id?: string;
        tier?: string;
      };
    };
    subscription_code?: string;
  };
};

function getMetadata(body: PaystackWebhook) {
  return {
    tenant_id:
      body.data?.metadata?.tenant_id ?? body.data?.customer?.metadata?.tenant_id,
    tier: body.data?.metadata?.tier ?? body.data?.customer?.metadata?.tier,
  };
}

async function insertSubscriptionEvent({
  tenantId,
  eventType,
  amountNaira,
  reference,
}: {
  tenantId: string;
  eventType: string;
  amountNaira?: number;
  reference?: string | null;
}) {
  await supabaseAdmin.from("subscription_events").insert({
    tenant_id: tenantId,
    event_type: eventType,
    amount_naira: amountNaira ?? 0,
    paystack_reference: reference ?? null,
  });
}

async function notifyPaymentFailed(tenantId: string) {
  if (!process.env.RESEND_API_KEY) return;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, owner_id")
    .eq("id", tenantId)
    .maybeSingle();

  let ownerEmail: string | null = null;

  if (tenant?.owner_id) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id);
    ownerEmail = data.user?.email ?? null;
  }

  if (!ownerEmail) {
    const { data: owner } = await supabaseAdmin
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .in("role", ["ceo", "owner"])
      .eq("is_active", true)
      .order("role", { ascending: true })
      .maybeSingle();

    if (owner?.user_id) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(owner.user_id);
      ownerEmail = data.user?.email ?? null;
    }
  }

  if (!ownerEmail) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cardinal OS Markets <billing@markets.cardinal.stuartdavidson.org>",
      to: ownerEmail,
      subject: "Action required: Payment failed for Cardinal OS Markets",
      html: `
        <p>Hello,</p>
        <p>Payment failed for ${tenant?.name ?? "your Cardinal OS Markets workspace"}.</p>
        <p>Please update your payment method or choose a plan to keep your workspace active.</p>
        <p><a href="${appUrl}/upgrade">Update billing</a></p>
      `,
    }),
  });
}

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 500 });
  }

  // Verify the signature against the RAW request body. Re-stringifying a
  // parsed object can differ from what Paystack signed (key order/encoding),
  // which would silently break verification — so hash the bytes as received.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  const body = JSON.parse(rawBody) as PaystackWebhook;

  const event = (body.event ?? "").toLowerCase();
  const { tenant_id: tenantId, tier } = getMetadata(body);

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant metadata." }, { status: 400 });
  }

  if (event === "charge.success") {
    await insertSubscriptionEvent({
      tenantId,
      eventType: "charge.success",
      amountNaira: Number(body.data?.amount ?? 0) / 100,
      reference: body.data?.reference ?? null,
    });

    const update: Record<string, unknown> = {
      subscription_status: "active",
    };
    if (tier) update.subscription_tier = tier;

    await supabaseAdmin.from("tenants").update(update).eq("id", tenantId);
    return NextResponse.json({ ok: true });
  }

  if (event === "subscription.disable" || event === "subscription.not_renew") {
    await supabaseAdmin
      .from("tenants")
      .update({ subscription_status: "cancelled" })
      .eq("id", tenantId);
    await insertSubscriptionEvent({
      tenantId,
      eventType: event,
      reference: body.data?.reference ?? body.data?.subscription_code ?? null,
    });
    return NextResponse.json({ ok: true });
  }

  if (event === "invoice.payment_failed") {
    await supabaseAdmin
      .from("tenants")
      .update({ subscription_status: "suspended" })
      .eq("id", tenantId);
    await insertSubscriptionEvent({
      tenantId,
      eventType: "invoice.payment_failed",
      amountNaira: Number(body.data?.amount ?? 0) / 100,
      reference: body.data?.reference ?? body.data?.subscription_code ?? null,
    });
    await notifyPaymentFailed(tenantId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ignored: true });
}
