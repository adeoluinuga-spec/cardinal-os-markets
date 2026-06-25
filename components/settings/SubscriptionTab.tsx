"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { UsageMeters } from "@/components/settings/UsageMeters";
import { useTenant } from "@/context/TenantContext";
import {
  TIER_LIMITS,
  TIER_NAMES,
  TIER_PRICES,
  normalizeTier,
  type SubscriptionTier,
} from "@/lib/tiers";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

type SubInfo = {
  tier: SubscriptionTier;
  status: string;
  price: number;
  trial_ends_at: string | null;
  trial_days_left: number;
  next_billing_at: string | null;
  email: string | null;
  tenant_id: string;
  paystack_public_key: string | null;
};

const PAID_TIERS: ("starter" | "growth" | "professional")[] = [
  "starter",
  "growth",
  "professional",
];

const TRIAL_LENGTH_DAYS = 14;

function naira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function planBullets(tier: "starter" | "growth" | "professional") {
  const limits = TIER_LIMITS[tier];
  const staff =
    limits.max_staff === -1 ? "Unlimited staff" : `Up to ${limits.max_staff} staff`;
  const orders =
    limits.max_orders_per_month === -1
      ? "Unlimited orders/month"
      : `${limits.max_orders_per_month.toLocaleString("en-NG")} orders/month`;
  const ai =
    limits.max_ai_queries_per_month === -1
      ? "Unlimited AI queries"
      : `${limits.max_ai_queries_per_month} AI queries/month`;
  const extra =
    tier === "professional"
      ? "All modules · Priority support"
      : limits.features.autopilot_inbox
        ? "All core modules · Autopilot"
        : "Core modules";
  return [staff, orders, ai, extra];
}

function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.PaystackPop) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.paystack.co/v1/inline.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function SubscriptionTab({ onToast }: { onToast: (m: string) => void }) {
  const { refetchTenant } = useTenant();
  const [info, setInfo] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings/subscription");
    const data = await res.json();
    setInfo(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    void loadPaystackScript();
  }, []);

  async function verifyPayment(reference: string, tier: string) {
    const res = await fetch("/api/subscription/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, tier }),
    });
    setProcessing(null);
    if (res.ok) {
      onToast("Subscription activated");
      await refetchTenant();
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      onToast(data.error ?? "Payment verification failed");
    }
  }

  async function selectPlan(tier: "starter" | "growth" | "professional") {
    if (!info) return;
    setProcessing(tier);
    const ready = await loadPaystackScript();
    if (!ready || !window.PaystackPop || !info.paystack_public_key || !info.email) {
      setProcessing(null);
      onToast("Payments are not available right now.");
      return;
    }
    const handler = window.PaystackPop.setup({
      key: info.paystack_public_key,
      email: info.email,
      amount: TIER_PRICES[tier] * 100,
      currency: "NGN",
      metadata: {
        tenant_id: info.tenant_id,
        tier,
        custom_fields: [
          { display_name: "Plan", variable_name: "plan", value: TIER_NAMES[tier] },
        ],
      },
      callback: (response: { reference: string }) => {
        void verifyPayment(response.reference, tier);
      },
      onClose: () => setProcessing(null),
    });
    handler.openIframe();
  }

  if (loading || !info) {
    return (
      <Card className="flex justify-center py-10">
        <Spinner className="h-6 w-6" />
      </Card>
    );
  }

  const tier = normalizeTier(info.tier);
  const trialUsedPct = Math.min(
    100,
    Math.max(
      0,
      Math.round(((TRIAL_LENGTH_DAYS - info.trial_days_left) / TRIAL_LENGTH_DAYS) * 100),
    ),
  );

  return (
    <div className="space-y-6">
      {/* Current plan */}
      {info.status === "trial" ? (
        <Card className="border-gold/40 bg-yellow-50">
          <p className="font-mono text-xs font-bold uppercase tracking-wide text-gold">
            Free trial
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink">
            {info.trial_days_left} days remaining
          </h2>
          <p className="mt-1 text-sm text-ink2">
            You are on a free trial with full access. Upgrade any time to keep your
            workspace after the trial ends.
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${trialUsedPct}%` }}
            />
          </div>
          <a href="#plans" className="mt-4 inline-block">
            <Button>Upgrade Now</Button>
          </a>
        </Card>
      ) : info.status === "active" ? (
        <Card className="border-green/30 bg-green-light/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green" aria-hidden="true" />
            <p className="font-semibold text-ink">
              {TIER_NAMES[tier]} plan · Active
            </p>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {naira(info.price)}
            <span className="text-base font-semibold text-ink2">/month</span>
          </p>
          <p className="mt-1 text-sm text-ink2">
            Next billing: {formatDate(info.next_billing_at)}
          </p>
          <a href="#plans" className="mt-4 inline-block">
            <Button variant="ghost" className="border border-blue-border bg-white">
              Manage Subscription
            </Button>
          </a>
        </Card>
      ) : (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
            <p className="font-semibold text-ink">Your subscription has ended.</p>
          </div>
          <p className="mt-1 text-sm text-ink2">
            Reactivate to restore access to your workspace.
          </p>
          <a href="#plans" className="mt-4 inline-block">
            <Button>Reactivate</Button>
          </a>
        </Card>
      )}

      {/* Usage */}
      <UsageMeters />

      {/* Pricing */}
      <div id="plans" className="grid gap-4 lg:grid-cols-3">
        {PAID_TIERS.map((planTier) => {
          const isCurrent = info.status === "active" && tier === planTier;
          const highlighted = planTier === "growth";
          return (
            <Card
              key={planTier}
              className={
                highlighted
                  ? "border-2 border-blue-primary"
                  : "border border-blue-border"
              }
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-bold text-ink">
                  {TIER_NAMES[planTier]}
                </p>
                {highlighted ? <Badge variant="blue">Popular</Badge> : null}
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-ink">
                {naira(TIER_PRICES[planTier])}
                <span className="text-sm font-semibold text-ink2">/month</span>
              </p>
              <ul className="mt-4 space-y-2">
                {planBullets(planTier).map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-ink2">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-green"
                      aria-hidden="true"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => selectPlan(planTier)}
                disabled={processing !== null || isCurrent}
                variant={highlighted ? "primary" : "ghost"}
                className={
                  highlighted
                    ? "mt-5 w-full"
                    : "mt-5 w-full border border-blue-border bg-white"
                }
              >
                {processing === planTier ? (
                  <Spinner className="h-4 w-4" />
                ) : isCurrent ? (
                  "Current plan"
                ) : (
                  "Select Plan"
                )}
              </Button>
            </Card>
          );
        })}
      </div>
      {!info.paystack_public_key ? (
        <p className="text-center text-xs text-ink3">
          Paystack is not configured, so checkout is disabled in this environment.
        </p>
      ) : null}
    </div>
  );
}
