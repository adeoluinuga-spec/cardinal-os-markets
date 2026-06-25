import Link from "next/link";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TIER_NAMES, TIER_PRICES } from "@/lib/tiers";

type PaidTier = "starter" | "growth" | "professional";

const TIERS: PaidTier[] = ["starter", "growth", "professional"];

type Row = {
  label: string;
  values: Record<PaidTier, string | boolean>;
};

const ROWS: Row[] = [
  { label: "Staff", values: { starter: "3", growth: "10", professional: "Unlimited" } },
  { label: "Customers", values: { starter: "200", growth: "1,000", professional: "Unlimited" } },
  { label: "Orders / month", values: { starter: "100", growth: "Unlimited", professional: "Unlimited" } },
  { label: "AI queries", values: { starter: "50 / mo", growth: "Unlimited", professional: "Unlimited" } },
  { label: "Tasks", values: { starter: false, growth: true, professional: true } },
  { label: "Autopilot", values: { starter: false, growth: true, professional: true } },
  { label: "Performance", values: { starter: false, growth: true, professional: true } },
  { label: "Activity Log", values: { starter: false, growth: false, professional: true } },
  { label: "SMS Broadcasts", values: { starter: false, growth: true, professional: true } },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-green" aria-label="Included" />
    ) : (
      <X className="mx-auto h-4 w-4 text-ink2/40" aria-label="Not included" />
    );
  }
  return <span className="text-sm font-semibold text-ink">{value}</span>;
}

function formatNaira(amount: number) {
  return `₦${(amount / 1000).toLocaleString("en-NG")}k`;
}

export default function UpgradePage() {
  return (
    <main className="min-h-screen bg-blue-pale px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-gold">
            Subscription required
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            Choose your plan
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink2">
            Your free trial included every feature with no limits. Pick a plan
            below to keep your workspace running — you can upgrade any time.
          </p>
        </div>

        <Card className="mt-8 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] border-collapse text-center">
            <thead>
              <tr className="border-b border-blue-border">
                <th className="px-4 py-4 text-left text-sm font-semibold text-ink2">
                  Feature
                </th>
                {TIERS.map((tier) => (
                  <th key={tier} className="px-4 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-display text-base font-bold text-ink">
                        {TIER_NAMES[tier]}
                      </span>
                      {tier === "growth" ? (
                        <Badge variant="gold">Recommended</Badge>
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-blue-border/60">
                  <td className="px-4 py-3 text-left text-sm font-semibold text-ink2">
                    {row.label}
                  </td>
                  {TIERS.map((tier) => (
                    <td
                      key={tier}
                      className={tier === "growth" ? "bg-blue-pale/60 px-4 py-3" : "px-4 py-3"}
                    >
                      <Cell value={row.values[tier]} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-4 py-4 text-left text-sm font-semibold text-ink2">
                  Price
                </td>
                {TIERS.map((tier) => (
                  <td
                    key={tier}
                    className={tier === "growth" ? "bg-blue-pale/60 px-4 py-4" : "px-4 py-4"}
                  >
                    <span className="font-display text-lg font-bold text-ink">
                      {formatNaira(TIER_PRICES[tier])}
                    </span>
                    <span className="block text-xs text-ink2">/month</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <Button
              key={tier}
              variant={tier === "growth" ? "primary" : "ghost"}
              className={tier === "growth" ? "" : "border border-blue-border bg-white"}
            >
              Choose {TIER_NAMES[tier]}
            </Button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-ink2">
          Need help choosing?{" "}
          <Link href="/app/settings" className="font-semibold text-blue-primary hover:underline">
            View your current usage
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
