"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Copy, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_primary: boolean | null;
};

type PayOrder = {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  customer?: { email?: string | null } | null;
  tenant?: { name?: string; logo_url?: string | null } | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.PaystackPop) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.paystack.co/v1/inline.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CustomerPaymentPage({ params }: { params: { token: string } }) {
  const [order, setOrder] = useState<PayOrder | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paystackKey, setPaystackKey] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [transfer, setTransfer] = useState({ amount: "", reference: "", bank_name: "" });
  const [proof, setProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/pay/${params.token}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setOrder(data.order);
      setBankAccounts(data.bankAccounts ?? []);
      setPaystackKey(data.paystackPublicKey ?? null);
      setEmail(data.order?.customer?.email ?? "");
      setTransfer((current) => ({ ...current, amount: String(Number(data.order?.balance ?? 0)) }));
    } else {
      setError("Order not found.");
    }
    setLoading(false);
  }, [params.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function payWithPaystack() {
    if (!order) return;
    if (!email.trim()) {
      setError("Enter your email address to continue with Paystack.");
      return;
    }
    setError("");
    setProcessing(true);
    const ready = await loadPaystackScript();
    if (!ready || !window.PaystackPop || !paystackKey) {
      setProcessing(false);
      setError("Paystack checkout is not available right now.");
      return;
    }
    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email,
      amount: Number(order.balance ?? 0) * 100,
      currency: "NGN",
      metadata: {
        order_id: order.id,
        tenant_id: order.tenant_id,
        tracking_token: params.token,
      },
      callback: async (response: { reference: string }) => {
        const verify = await fetch(`/api/pay/${params.token}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: response.reference }),
        });
        const data = await verify.json();
        setProcessing(false);
        if (verify.ok) {
          setMessage(data.message ?? "Payment received. Thank you!");
          await load();
        } else {
          setError(data.error ?? "Payment verification failed.");
        }
      },
      onClose: () => setProcessing(false),
    });
    handler.openIframe();
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    setProcessing(true);
    setError("");
    let proofUrl: string | null = null;
    let proofFileName: string | null = null;

    if (proof) {
      const formData = new FormData();
      formData.append("file", proof);
      const upload = await fetch(`/api/pay/${params.token}/upload-proof`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await upload.json();
      if (!upload.ok) {
        setProcessing(false);
        setError(uploadData.error ?? "Could not upload proof.");
        return;
      }
      proofUrl = uploadData.url;
      proofFileName = uploadData.fileName;
    }

    const response = await fetch(`/api/orders/${order.id}/submit-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(transfer.amount),
        reference: transfer.reference,
        bank_name: transfer.bank_name,
        channel: "bank_transfer",
        proof_url: proofUrl,
        proof_file_name: proofFileName,
        tracking_token: params.token,
      }),
    });
    const data = await response.json();
    setProcessing(false);
    if (response.ok) {
      setMessage(data.message ?? "Payment submitted. Awaiting Finance verification.");
      setFormOpen(false);
    } else {
      setError(data.error ?? "Could not submit payment.");
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-white"><Spinner className="h-8 w-8" /></main>;
  }

  if (!order) {
    return <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-ink">{error || "Order not found."}</main>;
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="flex flex-col items-center text-center">
          {order.tenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={order.tenant.logo_url} alt={order.tenant.name ?? "Tenant"} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-primary font-bold text-white">{order.tenant?.name?.charAt(0) ?? "C"}</div>
          )}
          <p className="mt-3 font-semibold text-ink">{order.tenant?.name ?? "Cardinal OS Markets"}</p>
        </div>

        <Card className="mt-8">
          <p className="font-mono text-xs font-bold uppercase text-blue-primary">Order {order.order_number}</p>
          <p className="mt-4 font-display text-5xl font-bold text-ink">{money(order.total)}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-green-light p-3">
              <p className="text-xs font-semibold text-green">Amount paid</p>
              <p className="font-display text-xl font-bold text-ink">{money(order.amount_paid)}</p>
            </div>
            <div className="rounded-lg bg-blue-light p-3">
              <p className="text-xs font-semibold text-blue-primary">Balance due</p>
              <p className="font-display text-xl font-bold text-blue-primary">{money(order.balance)}</p>
            </div>
          </div>
        </Card>

        {message ? <div className="mt-4 rounded-xl bg-green-light px-4 py-3 text-sm font-semibold text-green">{message}</div> : null}
        {error ? <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <Card className="mt-4">
          <h2 className="font-display text-2xl font-bold text-ink">Pay with Paystack</h2>
          {!paystackKey ? (
            <p className="mt-2 text-sm text-ink2">
              This business has not enabled Paystack checkout yet. Use bank transfer below.
            </p>
          ) : null}
          {!order.customer?.email ? (
            <Input className="mt-4" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
          ) : null}
          <Button className="mt-4 w-full" onClick={payWithPaystack} disabled={processing || !paystackKey || Number(order.balance ?? 0) <= 0}>
            Pay {money(order.balance)} with Paystack
          </Button>
        </Card>

        <Card className="mt-4">
          <button type="button" onClick={() => setBankOpen(!bankOpen)} className="flex w-full items-center justify-between text-left">
            <span className="font-display text-2xl font-bold text-ink">Pay via Bank Transfer</span>
            <ChevronDown className={`h-5 w-5 transition ${bankOpen ? "rotate-180" : ""}`} />
          </button>
          {bankOpen ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-ink2">Use <span className="font-mono font-bold text-blue-primary">{order.order_number}</span> as your payment reference.</p>
              {bankAccounts.map((account) => (
                <div key={account.id} className="rounded-xl border border-blue-border p-4">
                  <p className="font-semibold text-ink">{account.bank_name}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="font-mono text-lg font-bold text-blue-primary">{account.account_number}</p>
                    <button type="button" onClick={() => void navigator.clipboard.writeText(account.account_number)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-pale text-blue-primary" aria-label="Copy account number">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-ink2">{account.account_name}</p>
                </div>
              ))}
              <Button className="w-full" variant="ghost" onClick={() => setFormOpen(true)}>I&apos;ve made this transfer</Button>
            </div>
          ) : null}
        </Card>

        {formOpen ? (
          <Card className="mt-4">
            <form onSubmit={submitTransfer} className="space-y-4">
              <Input type="number" min={1} value={transfer.amount} onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })} placeholder="Amount" required />
              <Input value={transfer.reference} onChange={(event) => setTransfer({ ...transfer, reference: event.target.value })} placeholder="Reference" required />
              <Input value={transfer.bank_name} onChange={(event) => setTransfer({ ...transfer, bank_name: event.target.value })} placeholder="Bank name" />
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-border bg-blue-pale p-5 text-sm font-semibold text-blue-primary">
                <UploadCloud className="mb-2 h-5 w-5" />
                {proof ? proof.name : "Upload proof photo"}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => setProof(event.target.files?.[0] ?? null)} />
              </label>
              <Button type="submit" className="w-full" disabled={processing}>{processing ? "Submitting..." : "Submit Transfer Proof"}</Button>
            </form>
          </Card>
        ) : null}

        <p className="mt-8 text-center text-xs font-semibold text-ink3">Powered by Cardinal OS Markets</p>
      </div>
    </main>
  );
}
