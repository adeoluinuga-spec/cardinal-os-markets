"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import {
  TIER_NAMES,
  type SubscriptionTier,
  type TierLimits,
} from "@/lib/tiers";
import { cn } from "@/lib/utils";

type LimitKey = keyof Omit<TierLimits, "features">;

type UsageResponse = {
  tier: SubscriptionTier;
  limits: TierLimits;
  usage: Record<LimitKey, number>;
};

const METERS: { key: LimitKey; label: string }[] = [
  { key: "max_staff", label: "Staff" },
  { key: "max_customers", label: "Customers" },
  { key: "max_products", label: "Products" },
  { key: "max_orders_per_month", label: "Orders this month" },
  { key: "max_ai_queries_per_month", label: "AI queries this month" },
  { key: "max_sms_per_month", label: "SMS this month" },
  { key: "max_autopilot_actions_per_month", label: "Autopilot actions this month" },
];

function Meter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  if (limit === -1) {
    return (
      <div className="flex items-center justify-between py-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink2">{used} used</span>
          <Badge variant="blue">Unlimited</Badge>
        </div>
      </div>
    );
  }

  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const atLimit = used >= limit;
  const approaching = !atLimit && pct >= 80;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <span className="font-mono text-xs text-ink2">
          {used}/{limit} used &middot; {pct}%
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-pale">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            atLimit
              ? "bg-red-600"
              : approaching
                ? "bg-orange-500"
                : "bg-blue-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atLimit ? (
        <p className="mt-1 text-xs font-semibold text-red-700">
          Limit reached — upgrade to continue
        </p>
      ) : approaching ? (
        <p className="mt-1 text-xs font-semibold text-orange-700">
          Approaching limit
        </p>
      ) : null}
    </div>
  );
}

export function UsageMeters() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/usage")
      .then((res) => res.json())
      .then((json: UsageResponse & { error?: string }) => {
        if (!active) return;
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch(() => active && setError("Could not load usage."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <p className="text-sm text-ink2">
          {error ?? "Usage data is unavailable."}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-ink">Plan usage</p>
          <p className="mt-1 text-sm text-ink2">
            Current usage against your plan limits.
          </p>
        </div>
        <Badge variant="gold">{TIER_NAMES[data.tier]}</Badge>
      </div>
      <div className="mt-4 divide-y divide-blue-border">
        {METERS.map((meter) => (
          <Meter
            key={meter.key}
            label={meter.label}
            used={data.usage[meter.key] ?? 0}
            limit={data.limits[meter.key]}
          />
        ))}
      </div>
    </Card>
  );
}
