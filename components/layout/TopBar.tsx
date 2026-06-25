"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Plus } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { NewOrderModal } from "@/components/orders/NewOrderModal";

const ORDER_CREATOR_ROLES = ["owner", "admin", "sales_agent"];

const pageTitles: Record<string, string> = {
  "/app/dashboard": "War Room",
  "/app/tasks": "Tasks",
  "/app/customers": "Customers",
  "/app/orders": "Orders",
  "/app/submit-payment": "Submit Payment",
  "/app/performance": "Performance",
  "/app/products": "Products",
  "/app/incoming-stock": "Incoming Stock",
  "/app/dispatch": "Dispatch",
  "/app/pickup": "Store Pickup",
  "/app/finance": "Finance",
  "/app/finance/payments": "Payment Queue",
  "/app/brain": "Company Brain",
  "/app/ai": "AI Assistant",
  "/app/autopilot": "Autopilot",
  "/app/settings": "Settings",
  "/app/settings/activity": "Activity Log",
  "/app/rider": "Rider",
};

function getPageTitle(pathname: string) {
  const exactTitle = pageTitles[pathname];

  if (exactTitle) {
    return exactTitle;
  }

  const match = Object.entries(pageTitles)
    .filter(([href]) => pathname.startsWith(`${href}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];

  return match?.[1] ?? "Cardinal OS Markets";
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant, role } = useTenant();
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const shouldShowUpgrade =
    tenant?.subscription_status === "trial" ||
    tenant?.subscription_tier === "starter";
  const canCreateOrder = Boolean(role && ORDER_CREATOR_ROLES.includes(role));

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-blue-border bg-white px-4 md:left-[240px]">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-primary hover:bg-blue-light md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="truncate font-display text-xl font-bold text-ink">
          {getPageTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {canCreateOrder ? (
          <button
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-primary px-3 text-xs font-semibold text-white transition hover:bg-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-mid focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">New Order</span>
          </button>
        ) : null}
        {shouldShowUpgrade ? (
          <Link
            href="/upgrade"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-gold px-3 text-xs font-semibold text-white transition hover:bg-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            Upgrade
          </Link>
        ) : null}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-border text-blue-primary hover:bg-blue-light"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {canCreateOrder ? (
        <NewOrderModal
          open={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          onCreated={() => {
            setIsOrderModalOpen(false);
            router.push("/app/orders");
            router.refresh();
          }}
        />
      ) : null}
    </header>
  );
}
