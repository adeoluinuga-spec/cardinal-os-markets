"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FileUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Order = {
  id: string;
  order_number: string;
  customer_name?: string | null;
  total?: number | null;
  amount_paid?: number | null;
  balance: number;
  status?: string | null;
  payment_status?: string | null;
};

type ProofUpload = {
  proof_url: string;
  proof_hash: string;
};

type SubmittedPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  reference: string | null;
  channel: string | null;
  status: "pending" | "verified" | "rejected" | "assigned";
  notes: string | null;
  created_at: string | null;
  verified_at: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function SubmitPaymentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<SubmittedPayment[]>([]);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [channel, setChannel] = useState("bank_transfer");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUpload, setProofUpload] = useState<ProofUpload | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/submit-payment/orders", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { orders?: Order[]; payments?: SubmittedPayment[] }) => {
        setOrders(data.orders ?? []);
        setPayments(data.payments ?? []);
      });
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === orderId) ?? null,
    [orderId, orders],
  );
  const numericAmount = Number(amount || 0);
  const balance = Number(selectedOrder?.balance ?? 0);
  const remainingAfterPayment = Math.max(0, balance - numericAmount);
  const amountTooHigh = selectedOrder ? numericAmount > balance : false;
  const isPartial = selectedOrder ? numericAmount > 0 && numericAmount < balance : false;

  function selectOrder(nextOrderId: string) {
    setOrderId(nextOrderId);
    const order = orders.find((item) => item.id === nextOrderId);
    setAmount(order ? String(Number(order.balance ?? 0)) : "");
    setMessage("");
    setProofUpload(null);
    setProofFile(null);
  }

  async function uploadProof(file: File) {
    if (!orderId) {
      setMessage("Select an order before uploading proof.");
      return;
    }

    setMessage("");
    setProofFile(file);
    setProofUpload(null);
    const payload = new FormData();
    payload.append("proof", file);
    payload.append("order_id", orderId);

    setIsUploading(true);
    const response = await fetch("/api/submit-payment/upload-proof", {
      method: "POST",
      body: payload,
    });
    setIsUploading(false);

    const data = (await response.json()) as ProofUpload & { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Unable to upload proof.");
      return;
    }

    setProofUpload({ proof_url: data.proof_url, proof_hash: data.proof_hash });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!selectedOrder) {
      setMessage("Select an unpaid order.");
      return;
    }

    if (numericAmount <= 0) {
      setMessage("Enter a payment amount.");
      return;
    }

    if (amountTooHigh) {
      setMessage(`Amount cannot exceed the balance of ${money(balance)}.`);
      return;
    }

    if (!proofUpload) {
      setMessage("Upload proof of payment before submitting.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/submit-payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        amount: numericAmount,
        reference,
        channel,
        proof_url: proofUpload.proof_url,
        proof_hash: proofUpload.proof_hash,
      }),
    });
    setIsSubmitting(false);

    const data = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Unable to submit payment.");
      return;
    }

    setMessage(data.message ?? "Payment submitted for finance review.");
    setOrderId("");
    setAmount("");
    setReference("");
    setProofFile(null);
    setProofUpload(null);
    const refreshed = await fetch("/api/submit-payment/orders", { cache: "no-store" });
    const refreshedData = (await refreshed.json()) as {
      orders?: Order[];
      payments?: SubmittedPayment[];
    };
    setOrders(refreshedData.orders ?? []);
    setPayments(refreshedData.payments ?? []);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submit Payment"
        subtitle="Record customer payments and send proof to Finance for verification."
      />
      <Card>
        <form onSubmit={submit} className="grid gap-4">
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink2">Order</span>
            <select
              value={orderId}
              onChange={(event) => selectOrder(event.target.value)}
              required
              className="h-10 w-full rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
            >
              <option value="">Select unpaid order</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_number} - {order.customer_name ?? "Customer"} - Balance {money(Number(order.balance ?? 0))}
                </option>
              ))}
            </select>
          </label>

          {selectedOrder ? (
            <div className="grid gap-3 rounded-xl border border-blue-border bg-blue-pale p-4 text-sm md:grid-cols-4">
              <Metric label="Order total" value={money(Number(selectedOrder.total ?? 0))} />
              <Metric label="Paid so far" value={money(Number(selectedOrder.amount_paid ?? 0))} />
              <Metric label="Balance" value={money(balance)} />
              <Metric label="Status" value={selectedOrder.status ?? "quote"} />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink2">
                Amount paid
              </span>
              <Input
                required
                type="number"
                min={1}
                max={selectedOrder ? balance : undefined}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Amount paid"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink2">
                Reference number
              </span>
              <Input
                required
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Reference number"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink2">
                Channel
              </span>
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="h-10 w-full rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="pos">POS</option>
                <option value="paystack">Paystack</option>
              </select>
            </label>
          </div>

          {amountTooHigh ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Amount cannot be higher than the outstanding balance.
            </p>
          ) : isPartial ? (
            <p className="rounded-lg bg-yellow-50 px-3 py-2 text-sm font-semibold text-gold">
              This will be submitted as a partial payment. Remaining balance:
              {" "}
              {money(remainingAfterPayment)}.
            </p>
          ) : null}

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-border bg-blue-pale px-4 py-6 text-center transition hover:border-blue-primary hover:bg-blue-light">
            <FileUp className="h-6 w-6 text-blue-primary" />
            <span className="mt-2 text-sm font-semibold text-ink">
              {proofFile ? proofFile.name : "Upload proof of payment"}
            </span>
            <span className="mt-1 text-xs text-ink3">JPG, PNG, WEBP, or PDF</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadProof(file);
              }}
            />
          </label>

          {isUploading ? (
            <p className="text-sm font-semibold text-blue-primary">Uploading proof...</p>
          ) : proofUpload ? (
            <p className="rounded-lg bg-green-light px-3 py-2 text-sm font-semibold text-green">
              Proof uploaded and ready to submit.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={
              isSubmitting ||
              isUploading ||
              !selectedOrder ||
              !proofUpload ||
              amountTooHigh ||
              numericAmount <= 0
            }
          >
            {isSubmitting ? "Submitting..." : "Submit Payment"}
          </Button>
          {message ? (
            <p className="rounded-lg bg-blue-pale px-3 py-2 text-sm font-semibold text-blue-primary">
              {message}
            </p>
          ) : null}
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-blue-border px-5 py-4">
          <h2 className="font-display text-xl font-bold text-ink">
            My submitted payments
          </h2>
          <p className="mt-1 text-sm text-ink2">
            Track whether Finance has approved or rejected each proof.
          </p>
        </div>
        {payments.length === 0 ? (
          <div className="px-5 py-8 text-sm font-semibold text-ink2">
            No payment proofs submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-blue-pale text-xs uppercase text-ink3">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Finance note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-border">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-5 py-4 font-mono font-semibold text-blue-primary">
                      {payment.reference ?? "none"}
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">
                      {money(Number(payment.amount ?? 0))}
                    </td>
                    <td className="px-5 py-4 text-ink2">
                      {formatChannel(payment.channel)}
                    </td>
                    <td className="px-5 py-4 text-ink2">
                      {payment.created_at
                        ? new Date(payment.created_at).toLocaleString("en-NG")
                        : "Unknown"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={paymentStatusVariant(payment.status)}>
                        {payment.status === "verified"
                          ? "Approved"
                          : payment.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-ink2">{payment.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatChannel(value: string | null) {
  return (value ?? "unknown")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function paymentStatusVariant(status: string) {
  if (status === "verified") return "green";
  if (status === "rejected") return "red";
  return "gold";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink3">
        {label}
      </p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
