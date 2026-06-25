"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BusinessTab } from "@/components/settings/BusinessTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { BankAccountsTab } from "@/components/settings/BankAccountsTab";
import { SubscriptionTab } from "@/components/settings/SubscriptionTab";
import { cn } from "@/lib/utils";

type TabKey = "business" | "team" | "bank" | "subscription";

const TABS: { key: TabKey; label: string }[] = [
  { key: "business", label: "Business" },
  { key: "team", label: "Team" },
  { key: "bank", label: "Bank Accounts" },
  { key: "subscription", label: "Subscription" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("business");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your business, team, payments and plan." />

      <div className="flex gap-1 overflow-x-auto border-b border-blue-border">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              tab === item.key
                ? "border-blue-primary text-blue-primary"
                : "border-transparent text-ink2 hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "business" ? <BusinessTab onToast={setToast} /> : null}
      {tab === "team" ? <TeamTab onToast={setToast} /> : null}
      {tab === "bank" ? <BankAccountsTab onToast={setToast} /> : null}
      {tab === "subscription" ? <SubscriptionTab onToast={setToast} /> : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
