"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Row = {
  user?: { full_name?: string; role?: string };
  orders_created: number;
  order_value: number;
  customers_managed: number;
  payments_submitted: number;
  payments_verified: number;
  tasks_completed: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value || 0);
}

export default function PerformancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [brief, setBrief] = useState("");

  useEffect(() => {
    fetch("/api/performance", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { rows?: Row[] }) => setRows(data.rows ?? []));
  }, []);

  async function getBrief() {
    const response = await fetch("/api/performance/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await response.json();
    setBrief(data.brief ?? "");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Performance" subtitle="Owner-level operating snapshot for sales, payment pressure, and stock attention.">
        <Button onClick={getBrief}><TrendingUp className="h-4 w-4" /> Generate Brief</Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-ink2">Team Revenue</p><p className="mt-2 font-display text-3xl font-bold text-ink">{money(rows.reduce((sum, row) => sum + Number(row.order_value ?? 0), 0))}</p></Card>
        <Card><p className="text-sm text-ink2">Orders Created</p><p className="mt-2 font-display text-3xl font-bold text-ink">{rows.reduce((sum, row) => sum + Number(row.orders_created ?? 0), 0)}</p></Card>
        <Card><p className="text-sm text-ink2">Payments Submitted</p><p className="mt-2 font-display text-3xl font-bold text-ink">{rows.reduce((sum, row) => sum + Number(row.payments_submitted ?? 0), 0)}</p></Card>
        <Card><p className="text-sm text-ink2">Tasks Completed</p><p className="mt-2 font-display text-3xl font-bold text-ink">{rows.reduce((sum, row) => sum + Number(row.tasks_completed ?? 0), 0)}</p></Card>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-blue-pale text-xs uppercase text-ink3">
              <tr>
                <th className="px-5 py-3">Team Member</th>
                <th className="px-5 py-3">Orders</th>
                <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">Customers</th>
                <th className="px-5 py-3">Payments</th>
                <th className="px-5 py-3">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-border">
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="px-5 py-4 font-semibold text-ink">{row.user?.full_name ?? "Team member"}</td>
                  <td className="px-5 py-4">{row.orders_created}</td>
                  <td className="px-5 py-4">{money(row.order_value)}</td>
                  <td className="px-5 py-4">{row.customers_managed}</td>
                  <td className="px-5 py-4">{row.payments_verified}/{row.payments_submitted}</td>
                  <td className="px-5 py-4">{row.tasks_completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {brief ? <Card className="border-blue-primary bg-blue-pale"><Badge variant="green">AI brief</Badge><p className="mt-3 leading-7 text-ink">{brief}</p></Card> : null}
    </div>
  );
}
