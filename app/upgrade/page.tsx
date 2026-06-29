"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { TIER_NAMES, TIER_PRICES, type SubscriptionTier } from "@/lib/tiers";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

type PaidTier = "starter" | "growth" | "professional";

type SubscriptionInfo = {
  tier: SubscriptionTier;
  status: string;
  trial_days_left: number;
  email: string | null;
  tenant_id: string;
  paystack_public_key: string | null;
};

const TIERS: PaidTier[] = ["starter", "growth", "professional"];

const PLAN_COPY: Record<PaidTier, string[]> = {
  starter: ["Up to 5 staff", "1,000 orders/month", "50 AI queries", "100 SMS/month"],
  growth: ["Up to 10 staff", "3,000 orders/month", "500 AI queries", "500 SMS/month", "100 Autopilot actions"],
  professional: ["Up to 25 staff", "10,000 orders/month", "2,000 AI queries", "1,500 SMS/month", "1,000 Autopilot actions"],
};

function naira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.PaystackPop) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.paystack.co/v1/inline.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
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

function statusCopy(status: string | null, daysLeft: number) {
  if (status === "trial") {
    return daysLeft > 0
      ? `You are on a free trial. ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining.`
      : "Your trial has expired. Choose a plan to continue.";
  }

  if (status === "suspended") {
    return "Your subscription is suspended because a payment failed.";
  }

  if (status === "cancelled") {
    return "Your subscription has ended. Choose a plan to reactivate.";
  }

  if (status === "active") {
    return "Your subscription is active. You can switch plans below.";
  }

  return "Choose a plan to continue using Cardinal OS Markets.";
}

export default function UpgradePage() {
  const router = useRouter();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<PaidTier | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/subscription", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as SubscriptionInfo;
      })
      .then((data) => setInfo(data))
      .finally(() => setLoading(false));
    void loadPaystackScript();
  }, []);

  async function verifyPayment(reference: string, tier: PaidTier) {
    const response = await fetch("/api/subscription/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, tier }),
    });

    setProcessing(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Payment verification failed.");
      return;
    }

    router.push("/app/dashboard?upgraded=true");
  }

  async function selectPlan(tier: PaidTier) {
    if (!info) {
      router.push("/login?next=/upgrade");
      return;
    }

    setError("");
    setProcessing(tier);
    const ready = await loadPaystackScript();

    if (!ready || !window.PaystackPop || !info.paystack_public_key || !info.email) {
      setProcessing(null);
      setError("Checkout is not available right now. Please try again shortly.");
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
      },
      callback: (response: { reference: string }) => {
        void verifyPayment(response.reference, tier);
      },
      onClose: () => setProcessing(null),
    });

    handler.openIframe();
  }

  return (
    <main className="min-h-screen bg-blue-pale px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-gold">
            Subscription required
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-ink">
            Choose Your Plan
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink2">
            {loading
              ? "Checking your workspace subscription..."
              : statusCopy(info?.status ?? null, info?.trial_days_left ?? 0)}
          </p>
        </div>

        {!loading && !info ? (
          <Card className="mx-auto mt-8 max-w-lg text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-gold" />
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">
              Sign in to upgrade
            </h2>
            <p className="mt-2 text-sm text-ink2">
              We need to know which business workspace to upgrade.
            </p>
            <Link href="/login?next=/upgrade" className="mt-5 inline-flex">
              <Button>Sign In</Button>
            </Link>
          </Card>
        ) : null}

        {error ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const highlighted = tier === "growth";
            const current = info?.status === "active" && info.tier === tier;

            return (
              <Card
                key={tier}
                className={highlighted ? "border-2 border-blue-primary" : ""}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold text-ink">
                    {TIER_NAMES[tier]}
                  </h2>
                  {highlighted ? <Badge variant="gold">Recommended</Badge> : null}
                </div>
                <p className="mt-3 font-display text-3xl font-bold text-ink">
                  {naira(TIER_PRICES[tier])}
                  <span className="text-sm font-semibold text-ink2">/month</span>
                </p>
                <ul className="mt-5 space-y-3">
                  {PLAN_COPY[tier].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-ink2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  className={highlighted ? "mt-6 w-full" : "mt-6 w-full border border-blue-border bg-white"}
                  variant={highlighted ? "primary" : "ghost"}
                  disabled={processing !== null || current}
                  onClick={() => selectPlan(tier)}
                >
                  {processing === tier ? (
                    <Spinner className="h-4 w-4" />
                  ) : current ? (
                    "Current Plan"
                  ) : (
                    "Select Plan"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
