"use client";

import { useTenant } from "@/context/TenantContext";
import {
  getTierLimits,
  hasFeature,
  isAtLimit,
  normalizeTier,
  type TierLimits,
} from "@/lib/tiers";

export function useGating() {
  const { tenant } = useTenant();
  const tier = normalizeTier(tenant?.subscription_tier);

  const limits = getTierLimits(tier);

  return {
    tier,
    limits,
    can: (feature: keyof TierLimits["features"]) => hasFeature(tier, feature),
    atLimit: (key: keyof Omit<TierLimits, "features">, count: number) =>
      isAtLimit(tier, key, count),
    requiresUpgrade: (feature: keyof TierLimits["features"]) =>
      !hasFeature(tier, feature),
  };
}
