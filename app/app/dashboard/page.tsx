"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardWelcomeToast } from "./DashboardWelcomeToast";

type Stats = {
  todaysRevenue: number;
  ordersToday: number;
  outstanding: number;
  activeCustomers: number;
};

type RecentOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  channel: string | null;
  total: number | null;
  status: string | null;
  created_at: string | null;
};

type LowStockProduct = {
  id: string;
  name: string;
  stock_quantity: number | null;
  reorder_point: number | null;
};

type DashboardResponse = {
  stats: Stats;
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
};

const emptyStats: Stats = {
  todaysRevenue: 0,
  ordersToday: 0,
  outstanding: 0,
  activeCustomers: 0,
};

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLabel(value: string | null) {
  if (!value) {
    return "Manual";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusVariant(status: string | null) {
  if (status === "delivered" || status === "confirmed") {
    return "green";
  }

  if (status === "cancelled" || status === "failed") {
    return "red";
  }

  if (status === "dispatched" || status === "packaged") {
    return "blue";
  }

  return "gold";
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-t-4 border-t-blue-primary p-5">
      <p className="font-display text-3xl font-bold leading-none text-ink">
        {value}
      </p>
      <p className="mt-3 text-sm font-semibold text-ink2">{label}</p>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card className="border-t-4 border-t-blue-primary p-5">
      <div className="h-9 w-28 animate-pulse rounded bg-blue-light" />
      <div className="mt-3 h-4 w-24 animate-pulse rounded bg-blue-light" />
    </Card>
  );
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null,
  );
  const [brief, setBrief] = useState("");
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isBriefLoading, setIsBriefLoading] = useState(true);
  const stats = dashboardData?.stats ?? emptyStats;

  useEffect(() => {
    async function loadDashboard() {
      setIsStatsLoading(true);
      const response = await fetch("/api/dashboard/stats", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as DashboardResponse;
        setDashboardData(data);
      }

      setIsStatsLoading(false);
    }

    async function loadBrief() {
      setIsBriefLoading(true);
      const response = await fetch("/api/daily-brief", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as { brief: string };
        setBrief(data.brief);
      }

      setIsBriefLoading(false);
    }

    void loadDashboard();
    void loadBrief();
  }, []);

  return (
    <div className="space-y-6">
      <DashboardWelcomeToast />
      <PageHeader
        title="War Room"
        subtitle="Live pulse of revenue, orders, payments, customers, and stock."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isStatsLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatTile
              label="Today's Revenue"
              value={formatCurrency(stats.todaysRevenue)}
            />
            <StatTile label="Orders Today" value={stats.ordersToday} />
            <StatTile
              label="Outstanding"
              value={formatCurrency(stats.outstanding)}
            />
            <StatTile label="Active Customers" value={stats.activeCustomers} />
          </>
        )}
      </section>

      <Card className="border-blue-primary bg-blue-light/70 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-2 h-3 w-3 shrink-0 animate-pulse rounded-full bg-green" />
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-blue-primary">
              AI Morning Brief
            </p>
            {isBriefLoading ? (
              <div className="mt-3 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-white/80" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-white/80" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/80" />
              </div>
            ) : (
              <p className="mt-3 max-w-4xl text-sm leading-6 text-ink">
                {brief || "No brief available yet."}
              </p>
            )}
          </div>
        </div>
      </Card>

      {dashboardData?.lowStockProducts.length ? (
        <Card className="border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-orange-700"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-bold text-orange-900">
                Low stock alert
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {dashboardData.lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-lg border border-orange-200 bg-white px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-ink">
                      {product.name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-orange-700">
                      Current stock: {product.stock_quantity ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-blue-border px-5 py-4">
          <h2 className="font-display text-2xl font-bold text-ink">
            Recent orders
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-blue-pale text-xs uppercase text-ink3">
              <tr>
                <th className="px-5 py-3 font-bold">Order #</th>
                <th className="px-5 py-3 font-bold">Customer</th>
                <th className="px-5 py-3 font-bold">Channel</th>
                <th className="px-5 py-3 font-bold">Total</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-border">
              {isStatsLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-5 py-4">
                        <div className="h-4 animate-pulse rounded bg-blue-light" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : dashboardData?.recentOrders.length ? (
                dashboardData.recentOrders.map((order) => (
                  <tr key={order.id} className="bg-white">
                    <td className="px-5 py-4 font-mono font-semibold text-blue-primary">
                      {order.order_number}
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">
                      {order.customer_name}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="blue">{formatLabel(order.channel)}</Badge>
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(order.status)}>
                        {formatLabel(order.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-ink2">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-ink2">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-blue-border px-5 py-4">
          <Link
            href="/app/orders"
            className="text-sm font-semibold text-blue-primary hover:text-blue-dark"
          >
            View all orders →
          </Link>
        </div>
      </Card>
    </div>
  );
}
