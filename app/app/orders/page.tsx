"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoreVertical, Package, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewOrderModal } from "@/components/orders/NewOrderModal";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  channel: string | null;
  total: number | null;
  amount_paid: number | null;
  balance: number | null;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
};

const stages = [
  { label: "Quote", value: "quote" },
  { label: "Awaiting Payment", value: "awaiting_payment" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Packaged", value: "packaged" },
  { label: "Dispatched", value: "dispatched" },
  { label: "Delivered", value: "delivered" },
];

const filters = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  ...stages,
  { label: "Cancelled", value: "cancelled" },
];

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatLabel(value: string | null) {
  if (!value) return "Manual";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function relativeTime(value: string | null) {
  if (!value) return "-";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function channelClass(channel: string | null) {
  const classes: Record<string, string> = {
    whatsapp: "bg-green-light text-green",
    walk_in: "bg-blue-light text-blue-primary",
    phone: "bg-slate-100 text-slate-700",
    website: "bg-purple-50 text-purple-700",
    instagram: "bg-pink-50 text-pink-700",
    manual: "bg-slate-100 text-slate-700",
  };
  return classes[channel ?? "manual"] ?? classes.manual;
}

function statusVariant(status: string | null) {
  if (status === "delivered" || status === "confirmed") return "green";
  if (status === "cancelled") return "red";
  if (status === "quote" || status === "awaiting_payment") return "gold";
  return "blue";
}

function countFor(value: string, counts: Record<string, number>) {
  if (value === "all") return Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (value === "active") {
    return ["quote", "awaiting_payment", "confirmed", "packaged", "dispatched"].reduce(
      (sum, key) => sum + (counts[key] ?? 0),
      0,
    );
  }
  return counts[value] ?? 0;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeStatus, setActiveStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const apiStatus = activeStatus === "active" ? "all" : activeStatus;
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(`/api/orders/list?status=${apiStatus}`, {
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as {
        orders: Order[];
        counts: Record<string, number>;
      };
      setOrders(data.orders);
      setCounts(data.counts);
    }

    setIsLoading(false);
  }, [apiStatus]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (window.sessionStorage.getItem("cardinal-autopilot-draft")) setIsModalOpen(true);
  }, []);

  const visibleOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders
      .filter((order) => {
        const activeMatch =
          activeStatus !== "active" ||
          !["delivered", "cancelled"].includes(order.status ?? "");
        const searchMatch =
          !needle ||
          `${order.order_number} ${order.customer_name}`.toLowerCase().includes(needle);
        return activeMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sortMode === "oldest") {
          return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
        }
        if (sortMode === "highest") return Number(b.total ?? 0) - Number(a.total ?? 0);
        if (sortMode === "lowest") return Number(a.total ?? 0) - Number(b.total ?? 0);
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
  }, [activeStatus, orders, search, sortMode]);

  const totalValue = visibleOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      {toast ? (
        <div className="fixed right-4 top-16 z-50 rounded-xl border border-blue-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg">
          {toast}
        </div>
      ) : null}

      <PageHeader title="Order Pipeline" subtitle="Track quotes through payment, packaging, dispatch, and delivery.">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </PageHeader>

      <div className="overflow-x-auto rounded-xl border border-blue-border bg-white">
        <div className="flex min-w-[640px]">
          {stages.map((stage, index) => {
            const active = activeStatus === stage.value;
            return (
              <button
                key={stage.value}
                type="button"
                onClick={() => setActiveStatus(active ? "active" : stage.value)}
                className="flex-1 px-3 py-5 text-center transition"
                style={{
                  background: active ? "var(--blue)" : "transparent",
                  borderRight: index < stages.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span
                  className="block font-display text-[28px] font-bold leading-none"
                  style={{ color: active ? "white" : "var(--ink)" }}
                >
                  {counts[stage.value] ?? 0}
                </span>
                <span
                  className="mt-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em]"
                  style={{ color: active ? "rgba(255,255,255,0.75)" : "var(--ink3)" }}
                >
                  {stage.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => {
            const active = activeStatus === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveStatus(filter.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border-blue-primary bg-blue-primary text-white"
                    : "border-blue-border bg-white text-ink2 hover:bg-blue-pale",
                )}
              >
                {filter.label} ({countFor(filter.value, counts)})
              </button>
            );
          })}

          <div className="relative w-full min-w-0 flex-1 sm:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer or order"
              className="h-9 w-full rounded-md border border-blue-border bg-white pl-9 pr-8 text-sm outline-none focus:border-blue-primary"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-blue-pale"
              >
                <X className="h-3.5 w-3.5 text-ink3" />
              </button>
            ) : null}
          </div>

          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="h-9 rounded-md border border-blue-border bg-white px-3 text-xs font-semibold text-ink2 outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest value</option>
            <option value="lowest">Lowest value</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="flex items-start justify-between gap-3 border-b border-blue-border px-5 py-4">
            <div>
              <h2 className="font-display text-[20px] font-bold text-ink">
                {activeStatus === "active" ? "Active" : formatLabel(activeStatus)} Orders
              </h2>
              <p className="mt-1 text-xs text-ink2">
                {visibleOrders.length} orders · {formatCurrency(totalValue)} total
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : visibleOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-blue-pale font-mono text-[10px] uppercase tracking-[0.12em] text-ink3">
                  <tr>
                    <th className="px-5 py-3">Order #</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Channel</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Paid / Balance</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-border">
                  {visibleOrders.map((order) => {
                    const balance = Number(order.balance ?? 0);
                    return (
                      <tr key={order.id} className="bg-white hover:bg-blue-pale">
                        <td className="px-5 py-4">
                          <Link href={`/app/orders/${order.id}`} className="font-mono font-bold text-blue-primary">
                            {order.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-4 font-semibold text-ink">{order.customer_name}</td>
                        <td className="px-5 py-4">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase", channelClass(order.channel))}>
                            {formatLabel(order.channel)}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono font-semibold text-ink">{formatCurrency(order.total)}</td>
                        <td className="px-5 py-4">
                          <span className={cn("font-mono text-xs font-semibold", balance > 0 ? "text-red-700" : "text-green")}>
                            {formatCurrency(order.amount_paid)} / {formatCurrency(balance)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={statusVariant(order.status)}>{formatLabel(order.status)}</Badge>
                        </td>
                        <td className="px-5 py-4 text-ink2">{relativeTime(order.created_at)}</td>
                        <td className="px-5 py-4">
                          <Link href={`/app/orders/${order.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink2 hover:bg-blue-light">
                            <MoreVertical className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-pale">
                <Package className="h-5 w-5 text-blue-primary" />
              </div>
              <p className="font-semibold text-ink">No orders</p>
              <p className="text-sm text-ink2">No orders match this view.</p>
            </div>
          )}
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h3 className="font-display text-[18px] font-bold text-ink">Pipeline Health</h3>
            <div className="mt-5 space-y-4">
              {stages.slice(0, 5).map((stage) => {
                const total = Math.max(1, countFor("active", counts));
                const percent = Math.round(((counts[stage.value] ?? 0) / total) * 100);
                return (
                  <div key={stage.value}>
                    <div className="mb-2 flex justify-between text-xs font-semibold">
                      <span className="text-ink2">{stage.label}</span>
                      <span className="font-mono text-ink">{percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-blue-light">
                      <div className="h-full rounded-full bg-blue-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="border-blue-border bg-blue-light/70 p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-blue-primary">
              AI Order Insight
            </p>
            <p className="mt-3 text-sm leading-6 text-ink">
              {visibleOrders.length
                ? `${visibleOrders.length} orders in this view, worth ${formatCurrency(totalValue)}. Use the stage tracker to spot bottlenecks before delivery slows down.`
                : "No orders to analyse in this view yet."}
            </p>
          </Card>
        </div>
      </div>

      <NewOrderModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => {
          setToast("Order created successfully.");
          window.setTimeout(() => setToast(""), 3500);
          void fetchOrders();
        }}
      />
    </div>
  );
}
