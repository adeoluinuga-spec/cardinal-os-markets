"use client";

import type { ReactNode } from "react";
import { useGating } from "@/hooks/useGating";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";
import {
  FEATURE_LABELS,
  minimumTierForFeature,
  type TierLimits,
} from "@/lib/tiers";

type FeatureGateProps = {
  feature: keyof TierLimits["features"];
  children: ReactNode;
  fallback?: ReactNode;
};

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { can, tier } = useGating();

  if (can(feature)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <UpgradePrompt
      feature={FEATURE_LABELS[feature]}
      requiredTier={minimumTierForFeature(feature)}
      currentTier={tier}
    />
  );
}
