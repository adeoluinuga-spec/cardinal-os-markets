import { NextResponse } from "next/server";
import { getCurrentUserWithTenant } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  TIER_PRICES,
  type SubscriptionTier,
} from "@/lib/tiers";

const PAID_TIERS = new Set<SubscriptionTier>([
  "starter",
  "growth",
  "professional",
]);

export async function POST(request: Request) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role || !["ceo", "owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { reference, tier } = (await request.json()) as {
    reference?: string;
    tier?: SubscriptionTier;
  };

  if (!reference || !tier || !PAID_TIERS.has(tier)) {
    return NextResponse.json(
      { error: "A payment reference and valid tier are required." },
      { status: 400 },
    );
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Payments are not configured." },
      { status: 500 },
    );
  }

  // Verify the transaction server-side — never trust the client callback alone.
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const verifyJson = (await verifyRes.json()) as {
    status?: boolean;
    data?: { status?: string; amount?: number; metadata?: { tenant_id?: string } };
  };

  const txn = verifyJson.data;
  if (!verifyJson.status || txn?.status !== "success") {
    return NextResponse.json(
      { error: "Payment could not be verified." },
      { status: 402 },
    );
  }

  const expectedAmount = TIER_PRICES[tier] * 100; // kobo
  if (Number(txn?.amount) !== expectedAmount) {
    return NextResponse.json(
      { error: "Payment amount does not match the selected plan." },
      { status: 400 },
    );
  }
  if (txn?.metadata?.tenant_id && txn.metadata.tenant_id !== t.id) {
    return NextResponse.json(
      { error: "Payment was made for a different account." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("tenants")
    .update({
      subscription_tier: tier,
      subscription_status: "active",
    })
    .eq("id", t.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await supabaseAdmin.from("subscription_events").insert({
    tenant_id: t.id,
    event_type: "upgrade",
    tier,
    amount_naira: TIER_PRICES[tier],
    paystack_reference: reference,
  });

  return NextResponse.json({ ok: true, tier, status: "active" });
}
