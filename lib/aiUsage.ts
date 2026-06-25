import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTierLimits, normalizeTier } from "@/lib/tiers";

type TenantLike = { id: string; subscription_tier?: string | null };

function firstOfNextMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);
}

/**
 * Returns a 403 NextResponse if the tenant has exhausted its monthly AI query
 * quota, otherwise null. Mirrors the gating enforced in /api/brain/query.
 */
export async function aiQuotaResponse(
  supabase: SupabaseClient,
  tenant: TenantLike,
): Promise<NextResponse | null> {
  const tier = normalizeTier(tenant.subscription_tier ?? null);
  const max = getTierLimits(tier).max_ai_queries_per_month;
  if (max === -1) {
    return null;
  }

  const { data: usage } = await supabase.rpc("get_usage", {
    p_tenant_id: tenant.id,
    p_metric: "ai_queries",
  });

  if ((usage ?? 0) >= max) {
    return NextResponse.json(
      {
        error: "USAGE_LIMIT_REACHED",
        message: `You have used all ${max} AI queries for this month. Upgrade to Growth or Professional for unlimited AI queries.`,
        limit: max,
        current: usage ?? 0,
        resets_on: firstOfNextMonthIso(),
        upgrade_required: true,
      },
      { status: 403 },
    );
  }

  return null;
}

/** Increment the tenant's monthly AI query counter. */
export async function recordAiQuery(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<void> {
  await supabase.rpc("increment_usage", {
    p_tenant_id: tenantId,
    p_metric: "ai_queries",
  });
}
