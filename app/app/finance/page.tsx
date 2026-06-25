"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  reference: string;
  amount: number;
  channel: string | null;
  status: string;
  verified_at: string | null;
  created_at: string | null;
  order?: { order_number?: string; customer_name?: string } | null;
};

type UnpaidOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  amount_paid: number;
  balance: number;
  created_at: string | null;
};

type Overview = {
  stats: {
    totalRevenue: number;
    monthRevenue: number;
    outstanding: number;
    collectionRate: number;
  };
  chart: { day: string; date: string; revenue: number }[];
  transactions: Transaction[];
  unpaidOrders: UnpaidOrder[];
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatLabel(value: string | null) {
  return (value ?? "unknown")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function daysSince(value: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
}

function channelVariant(channel: string | null) {
  if (channel === "cash") return "green";
  if (channel === "pos") return "blue";
  if (channel === "paystack") return "gold";
  return "orange";
}

export default function FinancePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const sortedUnpaid = [...(overview?.unpaidOrders ?? [])].sort(
    (a, b) => daysSince(b.created_at) - daysSince(a.created_at),
  );

  useEffect(() => {
    fetch("/api/finance/overview", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: Overview) => setOverview(data));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" subtitle="Revenue, collections, payment verification, and unpaid order aging.">
        <Link href="/app/finance/payments" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-dark">
          Payment Queue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total Revenue All Time" value={money(overview?.stats.totalRevenue ?? 0)} />
        <Stat label="This Month Revenue" value={money(overview?.stats.monthRevenue ?? 0)} />
        <Stat label="Outstanding" value={money(overview?.stats.outstanding ?? 0)} />
        <Stat label="Collection Rate" value={`${overview?.stats.collectionRate ?? 0}%`} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-ink">Revenue Last 7 Days</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview?.chart ?? []}>
              <CartesianGrid stroke="#D8E2F4" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₦${Number(value).toLocaleString("en-NG")}`} width={82} />
              <Tooltip formatter={(value) => money(Number(value))} labelClassName="font-semibold text-ink" />
              <Bar dataKey="revenue" fill="#1A4A8B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-blue-border px-5 py-4">
          <h2 className="font-display text-2xl font-bold text-ink">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-blue-pale text-xs uppercase text-ink3">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Order #</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-border">
              {(overview?.transactions ?? []).map((payment) => (
                <tr key={payment.id}>
                  <td className="px-5 py-4 font-mono font-semibold text-blue-primary">{payment.reference}</td>
                  <td className="px-5 py-4">{payment.order?.order_number ?? "—"}</td>
                  <td className="px-5 py-4 font-semibold text-ink">{payment.order?.customer_name ?? "Customer"}</td>
                  <td className="px-5 py-4 font-semibold text-ink">{money(payment.amount)}</td>
                  <td className="px-5 py-4"><Badge variant={channelVariant(payment.channel)}>{formatLabel(payment.channel)}</Badge></td>
                  <td className="px-5 py-4 text-ink2">{new Date(payment.verified_at ?? payment.created_at ?? Date.now()).toLocaleDateString("en-NG")}</td>
                  <td className="px-5 py-4"><Badge variant="green">{payment.status}</Badge></td>
                </tr>
              ))}
              {overview?.transactions.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-ink2">No verified transactions yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-blue-border px-5 py-4">
          <h2 className="font-display text-2xl font-bold text-ink">Unpaid Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-blue-pale text-xs uppercase text-ink3">
              <tr>
                <th className="px-5 py-3">Order #</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Amount Paid</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Days Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-border">
              {sortedUnpaid.map((order) => {
                const age = daysSince(order.created_at);
                const risky = Number(order.balance ?? 0) > 0 && age > 14;
                return (
                  <tr key={order.id} className={cn(risky && "bg-red-50")}>
                    <td className="px-5 py-4">
                      <Link href={`/app/orders/${order.id}`} className="font-mono font-semibold text-blue-primary">{order.order_number}</Link>
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">{order.customer_name}</td>
                    <td className="px-5 py-4">{money(order.total)}</td>
                    <td className="px-5 py-4 text-green">{money(order.amount_paid)}</td>
                    <td className="px-5 py-4 font-semibold text-red-700">{money(order.balance)}</td>
                    <td className="px-5 py-4">{age} days</td>
                  </tr>
                );
              })}
              {sortedUnpaid.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-ink2">No unpaid orders.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-t-4 border-t-blue-primary">
      <p className="font-display text-3xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm font-semibold text-ink2">{label}</p>
    </Card>
  );
}
