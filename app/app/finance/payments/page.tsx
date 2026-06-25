"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Payment = { id: string; amount: number; channel: string; reference_number: string | null; status: string; order?: { order_number?: string } | null };

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value || 0);
}

export default function PaymentQueuePage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  async function load() {
    const response = await fetch("/api/payments/queue", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setPayments(data.payments ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approve(paymentId: string, action: "approve" | "verify_only") {
    await fetch("/api/payments/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payment_id: paymentId, action }) });
    void load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Queue" subtitle="Finance reviews submitted payments here. The main action is Approve & Confirm." />
      <div className="space-y-3">
        {payments.length === 0 ? <Card>No pending payments.</Card> : null}
        {payments.map((payment) => (
          <Card key={payment.id} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-2xl font-bold text-ink">{money(payment.amount)}</p>
                <Badge variant="gold">{payment.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink2">{payment.order?.order_number ?? "Order"} - {payment.channel} - Ref {payment.reference_number ?? "none"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => approve(payment.id, "approve")}><CheckCircle2 className="h-4 w-4" /> Approve & Confirm</Button>
              <Button variant="ghost" onClick={() => approve(payment.id, "verify_only")}>Verify Only</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
