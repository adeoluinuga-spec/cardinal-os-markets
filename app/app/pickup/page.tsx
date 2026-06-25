"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type PickupOrder = { id: string; order_number: string; pickup_code: string | null; pickup_confirmed_at: string | null; customers?: { full_name?: string; phone?: string | null } | null };

export default function StorePickupPage() {
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [confirming, setConfirming] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch("/api/pickup/list", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setOrders(data.orders ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate(orderId: string) {
    await fetch("/api/pickup/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: orderId }) });
    void load();
  }

  async function confirm(orderId: string) {
    await fetch("/api/pickup/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: orderId, pickup_code: confirming[orderId] }) });
    void load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Store Pickup" subtitle="Generate pickup codes and confirm walk-in collection at the shop counter." />
      <div className="space-y-3">
        {orders.length === 0 ? <Card>No pickup-ready orders.</Card> : null}
        {orders.map((order) => (
          <Card key={order.id} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono font-bold text-blue-primary">{order.order_number}</p>
                {order.pickup_confirmed_at ? <Badge variant="green">Collected</Badge> : order.pickup_code ? <Badge variant="gold">Code {order.pickup_code}</Badge> : <Badge variant="blue">Ready</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink2">{order.customers?.full_name ?? "Customer"} {order.customers?.phone ? `- ${order.customers.phone}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!order.pickup_code ? <Button onClick={() => generate(order.id)}><Store className="h-4 w-4" /> Generate Code</Button> : null}
              {!order.pickup_confirmed_at && order.pickup_code ? (
                <>
                  <Input className="w-32" value={confirming[order.id] ?? ""} onChange={(event) => setConfirming({ ...confirming, [order.id]: event.target.value })} placeholder="Code" />
                  <Button onClick={() => confirm(order.id)}>Confirm Pickup</Button>
                </>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
