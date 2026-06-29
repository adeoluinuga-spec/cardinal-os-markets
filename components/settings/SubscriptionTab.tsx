"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, MessageCircle, Smartphone, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { UsageMeters } from "@/components/settings/UsageMeters";
import { useTenant } from "@/context/TenantContext";
import {
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
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function planBullets(tier: "starter" | "growth" | "professional") {
  if (tier === "starter") {
    return [
      "Up to 5 staff",
      "200 customers and 50 products",
      "1,000 orders/month",
      "50 AI queries and 100 SMS/month",
    ];
  }

  if (tier === "growth") {
    return [
      "Up to 10 staff",
      "750 customers and 150 products",
      "3,000 orders/month",
      "500 AI queries and 500 SMS/month",
      "100 Autopilot actions/month",
      "Activity Log included",
    ];
  }

  return [
    "Up to 25 staff",
    "2,500 customers and 500 products",
    "10,000 orders/month",
    "2,000 AI queries and 1,500 SMS/month",
    "1,000 Autopilot actions/month",
    "API access and priority support",
  ];
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
  const [showCancelModal, setShowCancelModal] = useState(false);

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
              {TIER_NAMES[tier]} plan - Active
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
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="mt-4 block text-sm font-semibold text-red-700 hover:text-red-800"
          >
            Cancel subscription
          </button>
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
      <Card className="border border-blue-border bg-white">
        <p className="font-display text-lg font-bold text-ink">Payment options</p>
        <p className="mt-1 text-sm text-ink2">
          Web card payments run through Paystack. Mobile app billing is planned for
          when Cardinal OS Markets ships on iOS and Android.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <PaymentOption
            icon={<CreditCard className="h-5 w-5" />}
            title="Web card payment"
            description="Paystack card, bank transfer, USSD, and mobile money where available."
            status="Available now"
          />
          <PaymentOption
            icon={<Smartphone className="h-5 w-5" />}
            title="Apple App Store"
            description="Future in-app subscription path for iPhone and iPad users."
            status="Planned"
          />
          <PaymentOption
            icon={<Smartphone className="h-5 w-5" />}
            title="Google Play Billing"
            description="Future in-app subscription path for Android users."
            status="Planned"
          />
        </div>
      </Card>
      {!info.paystack_public_key ? (
        <p className="text-center text-xs text-ink3">
          Paystack is not configured, so checkout is disabled in this environment.
        </p>
      ) : null}
      {showCancelModal ? (
        <CancelSubscriptionModal
          onClose={() => setShowCancelModal(false)}
          onCancelled={async () => {
            setShowCancelModal(false);
            onToast("Subscription cancelled. Feedback saved.");
            await refetchTenant();
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function PaymentOption({
  icon,
  title,
  description,
  status,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-blue-border bg-blue-pale p-4">
      <div className="flex items-center gap-2 text-blue-primary">
        {icon}
        <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-ink2">
          {status}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink2">{description}</p>
    </div>
  );
}

function CancelSubscriptionModal({
  onClose,
  onCancelled,
}: {
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [offer, setOffer] = useState("support_call");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function cancel() {
    setError("");
    setSaving(true);
    const response = await fetch("/api/settings/subscription/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason,
        feedback,
        save_offer: offer,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to cancel subscription.");
      return;
    }

    onCancelled();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/50 p-4 backdrop-blur-sm">
      <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-red-700">
              Before you go
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">
              Can we help fix what is not working?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink2 hover:bg-blue-pale"
            aria-label="Close cancellation modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <RetentionCard
            title="Talk to support"
            body="We can help migrate data, fix setup problems, or walk your team through the workflow."
            active={offer === "support_call"}
            onClick={() => setOffer("support_call")}
          />
          <RetentionCard
            title="Downgrade instead"
            body="If cost is the issue, choose a lower plan and keep your business records intact."
            active={offer === "downgrade"}
            onClick={() => setOffer("downgrade")}
          />
          <RetentionCard
            title="Pause and review"
            body="Tell us what blocked you, and we will use it to improve the product."
            active={offer === "feedback"}
            onClick={() => setOffer("feedback")}
          />
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-ink2">
            Main reason
          </span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-11 w-full rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
          >
            <option value="">Select a reason</option>
            <option value="too_expensive">Too expensive</option>
            <option value="missing_features">Missing features</option>
            <option value="too_hard_to_use">Too hard to use</option>
            <option value="team_not_using_it">My team is not using it</option>
            <option value="switching_tools">Switching to another tool</option>
            <option value="temporary_pause">Temporary pause</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-ink2">
            Feedback
          </span>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className="min-h-28 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
            placeholder="What would have made you stay?"
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            <MessageCircle className="h-4 w-4" />
            Keep my subscription
          </Button>
          <Button variant="danger" onClick={cancel} disabled={saving || !reason}>
            {saving ? "Cancelling..." : "Confirm cancellation"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RetentionCard({
  title,
  body,
  active,
  onClick,
}: {
  title: string;
  body: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-blue-primary bg-blue-light"
          : "border-blue-border bg-white hover:bg-blue-pale"
      }`}
    >
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink2">{body}</p>
    </button>
  );
}
