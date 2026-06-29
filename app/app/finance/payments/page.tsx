"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Eye, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type Payment = {
  id: string;
  amount: number;
  channel: string | null;
  reference: string | null;
  status: "pending" | "verified" | "rejected" | "assigned";
  proof_url: string | null;
  notes: string | null;
  created_at: string | null;
  verified_at: string | null;
  order?: {
    id?: string;
    order_number?: string;
    customer_name?: string;
  } | null;
  submitted_by_user?: {
    full_name?: string;
    role?: string;
  } | null;
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

function relativeTime(value: string | null) {
  if (!value) return "Unknown";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function statusVariant(status: string) {
  if (status === "verified") return "green";
  if (status === "rejected") return "red";
  return "gold";
}

function channelVariant(channel: string | null) {
  if (channel === "cash") return "green";
  if (channel === "paystack") return "gold";
  if (channel === "pos") return "blue";
  return "orange";
}

export default function PaymentQueuePage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">("pending");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [softDuplicate, setSoftDuplicate] = useState<{ payment: Payment; message: string } | null>(null);

  const effectiveStatus =
    activeTab === "pending"
      ? "pending"
      : activeTab === "approved"
        ? "verified"
        : status;

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", effectiveStatus);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const response = await fetch(`/api/finance/payments?${params.toString()}`, { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { payments: Payment[] };
      setPayments(data.payments ?? []);
    }
  }, [effectiveStatus, search, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.status === "pending"),
    [payments],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  async function verify(payment: Payment, confirmSoftDuplicate = false) {
    setError("");
    const response = await fetch(`/api/finance/payments/${payment.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmSoftDuplicate }),
    });
    const data = (await response.json()) as { error?: string; message?: string; warning?: boolean };
    if (!response.ok) {
      if (data.warning && data.message) {
        setSoftDuplicate({ payment, message: data.message });
        return;
      }
      setError(data.error ?? "Unable to verify payment.");
      return;
    }
    setSoftDuplicate(null);
    showToast(data.message ?? "Payment verified.");
    await load();
  }

  async function reject() {
    if (!rejecting) return;
    setError("");
    const response = await fetch(`/api/finance/payments/${rejecting.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to reject payment.");
      return;
    }
    setRejecting(null);
    setRejectReason("");
    showToast(data.message ?? "Payment rejected.");
    await load();
  }

  return (
    <div className="space-y-6">
      {toast ? <div className="fixed right-4 top-16 z-50 rounded-xl border border-green-light bg-white px-4 py-3 text-sm font-semibold text-green shadow-lg">{toast}</div> : null}
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

      <PageHeader title="Payment Queue" subtitle="Verify or reject submitted payment proofs. Finance only, with owner/admin access." />

      <Card className="p-3">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "All Payments", value: "all" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value as "pending" | "approved" | "all")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                activeTab === tab.value ? "bg-blue-primary text-white" : "bg-blue-pale text-ink2 hover:bg-blue-light",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {activeTab === "pending" ? (
        <div className="space-y-4">
          {pendingPayments.length === 0 ? <Card>No pending payment proofs.</Card> : null}
          {pendingPayments.map((payment) => (
            <Card key={payment.id} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid gap-4 md:grid-cols-[96px_1fr]">
                <ProofThumb payment={payment} onView={setProofUrl} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-3xl font-bold text-ink">{money(payment.amount)}</p>
                    <Badge variant={channelVariant(payment.channel)}>{formatLabel(payment.channel)}</Badge>
                    <Badge variant="gold">Pending</Badge>
                  </div>
                  <p className="mt-3 text-sm text-ink2">Submitted by <span className="font-semibold text-ink">{payment.submitted_by_user?.full_name ?? "Team member"}</span></p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink2">
                    <Link href={`/app/orders/${payment.order?.id}`} className="font-semibold text-blue-primary">{payment.order?.order_number ?? "Order"}</Link>
                    <span>{payment.order?.customer_name ?? "Customer"}</span>
                    <span className="font-mono">Ref: {payment.reference ?? "none"}</span>
                    <span>{relativeTime(payment.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => verify(payment)} className="bg-green text-white hover:bg-green">
                  <Check className="h-4 w-4" />
                  Verify
                </Button>
                <Button variant="danger" onClick={() => setRejecting(payment)}>
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          {activeTab === "all" ? (
            <div className="grid gap-3 border-b border-blue-border p-4 md:grid-cols-4">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference or customer" />
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
          ) : (
            <div className="grid gap-3 border-b border-blue-border p-4 md:grid-cols-3">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference or customer" />
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-blue-pale text-xs uppercase text-ink3">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-border">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-5 py-4 font-mono font-semibold text-blue-primary">{payment.reference ?? "none"}</td>
                    <td className="px-5 py-4"><Link href={`/app/orders/${payment.order?.id}`} className="font-semibold text-blue-primary">{payment.order?.order_number ?? "Order"}</Link></td>
                    <td className="px-5 py-4 font-semibold text-ink">{payment.order?.customer_name ?? "Customer"}</td>
                    <td className="px-5 py-4 font-semibold text-ink">{money(payment.amount)}</td>
                    <td className="px-5 py-4"><Badge variant={channelVariant(payment.channel)}>{formatLabel(payment.channel)}</Badge></td>
                    <td className="px-5 py-4 text-ink2">{new Date(payment.created_at ?? Date.now()).toLocaleString("en-NG")}</td>
                    <td className="px-5 py-4"><Badge variant={statusVariant(payment.status)}>{payment.status === "verified" ? "approved" : payment.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {proofUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/70 p-4 backdrop-blur-sm" onClick={() => setProofUrl(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proofUrl} alt="Payment proof" className="max-h-[90vh] max-w-full rounded-xl bg-white object-contain shadow-2xl" />
        </div>
      ) : null}

      {softDuplicate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h2 className="font-display text-2xl font-bold text-ink">Possible Duplicate</h2>
            <p className="mt-3 text-sm leading-6 text-ink2">{softDuplicate.message}</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSoftDuplicate(null)}>Cancel</Button>
              <Button onClick={() => verify(softDuplicate.payment, true)}>Confirm to Proceed</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {rejecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h2 className="font-display text-2xl font-bold text-ink">Reason for rejection</h2>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="mt-4 min-h-32 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
              placeholder="Explain why this payment proof was rejected..."
            />
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
              <Button variant="danger" onClick={reject}>Reject Payment</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function ProofThumb({ payment, onView }: { payment: Payment; onView: (url: string) => void }) {
  if (!payment.proof_url) {
    return <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-blue-border bg-blue-pale text-xs font-semibold text-ink3">No proof</div>;
  }

  return (
    <button type="button" onClick={() => onView(payment.proof_url!)} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-blue-border bg-blue-pale">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={payment.proof_url} alt="Payment proof thumbnail" className="h-full w-full object-cover" />
      <span className="absolute inset-0 hidden items-center justify-center bg-blue-dark/50 text-white group-hover:flex">
        <Eye className="h-5 w-5" />
      </span>
    </button>
  );
}
