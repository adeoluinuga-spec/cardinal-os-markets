"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Order = { id: string; order_number: string; total_amount: number; balance: number; customers?: { full_name?: string } | null };

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value || 0);
}

export default function SubmitPaymentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [channel, setChannel] = useState("bank_transfer");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/submit-payment/orders", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { orders?: Order[] }) => setOrders(data.orders ?? []));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/submit-payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, amount: Number(amount), reference_number: reference, channel }),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    setMessage(response.ok ? data.message ?? "Payment submitted for finance review." : data.error ?? "Unable to submit payment.");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Submit Payment" subtitle="Sales and warehouse teams can record customer payments here for Finance to approve and confirm." />
      <Card>
        <form onSubmit={submit} className="grid gap-4">
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink2">Order</span>
            <select value={orderId} onChange={(event) => setOrderId(event.target.value)} required className="h-10 w-full rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light">
              <option value="">Select unpaid order</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>{order.order_number} - {order.customers?.full_name ?? "Customer"} - Balance {money(order.balance)}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <Input required type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount paid" />
            <Input required value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference number" />
            <select value={channel} onChange={(event) => setChannel(event.target.value)} className="h-10 rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="pos">POS</option>
              <option value="paystack">Paystack</option>
            </select>
          </div>
          <Button type="submit">Submit Payment</Button>
          {message ? <p className="rounded-lg bg-blue-pale px-3 py-2 text-sm font-semibold text-blue-primary">{message}</p> : null}
        </form>
      </Card>
    </div>
  );
}
