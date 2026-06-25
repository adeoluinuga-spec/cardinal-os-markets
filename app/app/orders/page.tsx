"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MoreVertical, Plus } from "lucide-react";
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

const tabs = [
  { label: "All", value: "all" },
  { label: "Quote", value: "quote" },
  { label: "Awaiting Payment", value: "awaiting_payment" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Packaged", value: "packaged" },
  { label: "Dispatched", value: "dispatched" },
  { label: "Delivered", value: "delivered" },
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
  if (!value) {
    return "Manual";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function relativeTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day ago";
  }

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
  if (status === "delivered" || status === "confirmed") {
    return "green";
  }

  if (status === "cancelled") {
    return "red";
  }

  if (status === "quote" || status === "awaiting_payment") {
    return "gold";
  }

  return "blue";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeStatus, setActiveStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(`/api/orders/list?status=${activeStatus}`, {
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
  }, [activeStatus]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-4 top-16 z-50 rounded-xl border border-blue-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg">
          {toast}
        </div>
      ) : null}

      <PageHeader
        title="Orders"
        subtitle="Track the sales pipeline from quote to delivery."
      >
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Order
        </Button>
      </PageHeader>

      <Card className="p-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition",
                activeStatus === tab.value
                  ? "bg-blue-primary text-white"
                  : "bg-blue-pale text-ink2 hover:bg-blue-light",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-xs",
                  activeStatus === tab.value
                    ? "bg-white/20 text-white"
                    : "bg-white text-ink2",
                )}
              >
                {counts[tab.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-blue-pale text-xs uppercase text-ink3">
                <tr>
                  <th className="px-5 py-3 font-bold">Order #</th>
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold">Channel</th>
                  <th className="px-5 py-3 font-bold">Total</th>
                  <th className="px-5 py-3 font-bold">Paid / Balance</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-border">
                {orders.length ? (
                  orders.map((order) => {
                    const balance = Number(order.balance ?? 0);

                    return (
                      <tr key={order.id} className="bg-white hover:bg-blue-pale">
                        <td className="px-5 py-4">
                          <Link
                            href={`/app/orders/${order.id}`}
                            className="font-mono font-bold text-blue-primary"
                          >
                            {order.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-4 font-semibold text-ink">
                          {order.customer_name}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 font-mono text-xs font-semibold uppercase",
                              channelClass(order.channel),
                            )}
                          >
                            {formatLabel(order.channel)}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-ink">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "font-semibold",
                              balance > 0 ? "text-red-700" : "text-green",
                            )}
                          >
                            {formatCurrency(order.amount_paid)} /{" "}
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={statusVariant(order.status)}>
                            {formatLabel(order.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-ink2">
                          {relativeTime(order.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/app/orders/${order.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-blue-light"
                            aria-label="View order"
                          >
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-ink2">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
