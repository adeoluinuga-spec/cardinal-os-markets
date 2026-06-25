import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";
import { TIER_PRICES, normalizeTier } from "@/lib/tiers";

function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export async function GET() {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const tier = normalizeTier(t.subscription_tier);
  const supabase = await createServerSupabaseClient();

  const { data: lastEvent } = await supabase
    .from("subscription_events")
    .select("tier, amount_naira, paystack_reference, created_at")
    .eq("tenant_id", t.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status: string = t.subscription_status ?? "trial";
  const trialEndsAt: string | null = t.trial_ends_at ?? null;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, daysBetween(new Date(), new Date(trialEndsAt)))
    : 0;

  // Best-effort next billing date: one month after the last successful charge.
  let nextBillingAt: string | null = null;
  if (status === "active" && lastEvent?.created_at) {
    const next = new Date(lastEvent.created_at);
    next.setMonth(next.getMonth() + 1);
    nextBillingAt = next.toISOString();
  }

  return NextResponse.json({
    tier,
    status,
    price: TIER_PRICES[tier],
    trial_ends_at: trialEndsAt,
    trial_days_left: trialDaysLeft,
    next_billing_at: nextBillingAt,
    last_payment: lastEvent ?? null,
    email: user?.email ?? null,
    tenant_id: t.id,
    paystack_public_key: process.env.PAYSTACK_PUBLIC_KEY ?? null,
  });
}
