"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  TIER_NAMES,
  TIER_PRICES,
  normalizeTier,
  type SubscriptionTier,
} from "@/lib/tiers";

type UpgradePromptProps = {
  /** Human-readable feature name, e.g. "Tasks" or "Performance tracking". */
  feature: string;
  requiredTier: "growth" | "professional";
  currentTier: SubscriptionTier;
  className?: string;
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function UpgradePrompt({
  feature,
  requiredTier,
  currentTier,
  className,
}: UpgradePromptProps) {
  const tier = normalizeTier(currentTier);
  const requiredName = TIER_NAMES[requiredTier];
  const price = TIER_PRICES[requiredTier];

  return (
    <Card className={className}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50">
          <Lock className="h-6 w-6 text-gold" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-display text-xl font-bold text-ink">
          {feature} is available on {requiredName} and above
        </h3>
        <p className="mt-2 text-sm text-ink2">
          Your current plan
          <span className="mx-1 align-middle">
            <Badge variant="gold">{TIER_NAMES[tier]}</Badge>
          </span>
          doesn&apos;t include this feature.
        </p>

        <Link href="/upgrade" className="mt-5 w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            Upgrade to {requiredName} — {formatNaira(price)}/month
          </Button>
        </Link>

        <Link
          href="/upgrade"
          className="mt-3 text-sm font-semibold text-blue-primary hover:underline"
        >
          See all plan features
        </Link>
      </div>
    </Card>
  );
}
