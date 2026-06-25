"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Boxes,
  Brain,
  ClipboardList,
  CreditCard,
  Database,
  LayoutDashboard,
  ListTodo,
  Lock,
  LogOut,
  Package,
  Receipt,
  Settings2,
  Store,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useGating } from "@/hooks/useGating";
import {
  FEATURE_LABELS,
  minimumTierForFeature,
  type TierLimits,
} from "@/lib/tiers";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
  feature?: keyof TierLimits["features"];
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const allRoles = ["owner", "admin"];

const navSections: NavSection[] = [
  {
    label: "Command",
    items: [
      {
        label: "War Room",
        href: "/app/dashboard",
        icon: LayoutDashboard,
        roles: allRoles,
      },
      {
        label: "Tasks",
        href: "/app/tasks",
        icon: ListTodo,
        roles: [...allRoles, "sales_agent", "warehouse", "finance"],
        feature: "tasks",
      },
      {
        label: "Customers",
        href: "/app/customers",
        icon: Users,
        roles: [...allRoles, "sales_agent"],
      },
      {
        label: "Orders",
        href: "/app/orders",
        icon: ClipboardList,
        roles: [...allRoles, "sales_agent", "warehouse", "finance"],
      },
      {
        label: "Submit Payment",
        href: "/app/submit-payment",
        icon: WalletCards,
        roles: [...allRoles, "sales_agent", "warehouse", "finance"],
      },
      {
        label: "Performance",
        href: "/app/performance",
        icon: TrendingUp,
        roles: allRoles,
        feature: "performance_tracking",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Products",
        href: "/app/products",
        icon: Package,
        roles: [...allRoles, "warehouse"],
      },
      {
        label: "Incoming Stock",
        href: "/app/incoming-stock",
        icon: Boxes,
        roles: [...allRoles, "warehouse"],
      },
      {
        label: "Dispatch",
        href: "/app/dispatch",
        icon: Truck,
        roles: [...allRoles, "warehouse"],
      },
      {
        label: "Store Pickup",
        href: "/app/pickup",
        icon: Store,
        roles: [...allRoles, "warehouse", "sales_agent"],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Finance",
        href: "/app/finance",
        icon: Receipt,
        roles: [...allRoles, "finance"],
      },
      {
        label: "Payment Queue",
        href: "/app/finance/payments",
        icon: CreditCard,
        roles: [...allRoles, "finance"],
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "Company Brain",
        href: "/app/brain",
        icon: Database,
        roles: allRoles,
      },
      {
        label: "AI Assistant",
        href: "/app/ai",
        icon: Bot,
        roles: [...allRoles, "sales_agent"],
      },
      {
        label: "Autopilot",
        href: "/app/autopilot",
        icon: Brain,
        roles: allRoles,
        feature: "autopilot_inbox",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Settings",
        href: "/app/settings",
        icon: Settings2,
        roles: allRoles,
      },
      {
        label: "Activity Log",
        href: "/app/settings/activity",
        icon: Activity,
        roles: allRoles,
        feature: "activity_log",
      },
    ],
  },
];

function formatRole(role: string | null) {
  if (!role) {
    return "Member";
  }

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTrialDaysLeft(trialEndsAt: string | null | undefined) {
  if (!trialEndsAt) {
    return 0;
  }

  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / 86_400_000));
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { tenant, tenantUser, role } = useTenant();
  const { can, tier } = useGating();
  const [gatedFeature, setGatedFeature] =
    useState<keyof TierLimits["features"] | null>(null);
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => role && item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
  const businessInitial = tenant?.name?.charAt(0).toUpperCase() ?? "C";
  const daysLeft = getTrialDaysLeft(tenant?.trial_ends_at);

  return (
    <aside
      className={cn(
        "flex h-screen w-[240px] flex-col bg-blue-dark text-white",
        mobile ? "w-full" : "fixed left-0 top-0 z-30 hidden md:flex",
      )}
    >
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          {tenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={`${tenant.name} logo`}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-bold text-blue-dark">
              {businessInitial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {tenant?.name ?? "Cardinal OS Markets"}
            </p>
            {tenant?.subscription_status === "trial" ? (
              <span className="mt-1 inline-flex rounded-full bg-gold px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                Trial - {daysLeft} days left
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <p className="px-2 font-mono text-[11px] font-bold uppercase tracking-wide text-blue-light/70">
              {section.label}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                const locked = item.feature ? !can(item.feature) : false;

                if (locked && item.feature) {
                  const feature = item.feature;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => setGatedFeature(feature)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-blue-light/60 transition hover:bg-white/10 hover:text-white"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                      <Lock className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-blue-light transition hover:bg-white/10 hover:text-white",
                      active && "bg-white text-blue-dark hover:bg-white",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold text-white">
          {tenantUser?.full_name ?? "Team member"}
        </p>
        <Badge variant="blue" className="mt-2 bg-white/10 text-blue-light">
          {formatRole(role)}
        </Badge>
        <Button
          variant="ghost"
          onClick={signOut}
          className="mt-4 w-full justify-start bg-white/5 text-blue-light hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>

      <Modal
        open={gatedFeature !== null}
        onClose={() => setGatedFeature(null)}
        title="Upgrade required"
        className="bg-transparent shadow-none"
      >
        {gatedFeature ? (
          <UpgradePrompt
            feature={FEATURE_LABELS[gatedFeature]}
            requiredTier={minimumTierForFeature(gatedFeature)}
            currentTier={tier}
            className="border-0 shadow-none"
          />
        ) : null}
      </Modal>
    </aside>
  );
}
