"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  channel: string | null;
  status: string;
  payment_status: string;
  subtotal: number | null;
  discount: number | null;
  total: number | null;
  amount_paid: number | null;
  balance: number | null;
  created_at: string | null;
  delivery_address: string | null;
  notes: string | null;
  customer?: {
    full_name: string;
    phone: string | null;
    customer_type: string | null;
  } | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Tenant = {
  name: string;
  logo_url: string | null;
  address: string | null;
};

type DetailResponse = {
  order: Order;
  items: OrderItem[];
  tenant: Tenant;
};

const nextActions: Record<string, string> = {
  quote: "Request Payment",
  awaiting_payment: "Confirm Order",
  confirmed: "Mark Packaged",
  packaged: "Dispatch",
};

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

function statusVariant(status: string | null) {
  if (status === "delivered" || status === "confirmed") {
    return "green";
  }

  if (status === "cancelled" || status === "rejected") {
    return "red";
  }

  if (status === "quote" || status === "awaiting_payment" || status === "pending") {
    return "gold";
  }

  return "blue";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(`/api/orders/${params.id}`, {
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as DetailResponse;
      setDetail(data);
    }

    setIsLoading(false);
  }, [params.id]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  const order = detail?.order;
  const canAdvance = useMemo(() => {
    if (!order) {
      return false;
    }

    if (order.status === "awaiting_payment") {
      return order.payment_status === "paid";
    }

    return Boolean(nextActions[order.status]);
  }, [order]);

  async function advanceStatus() {
    setError("");
    const response = await fetch(`/api/orders/${params.id}/advance`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to advance order.");
      return;
    }

    await fetchOrder();
  }

  if (isLoading || !detail || !order) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/app/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-primary hover:text-blue-dark"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to orders
      </Link>

      {message ? (
        <div className="rounded-xl border border-green-light bg-green-light px-4 py-3 text-sm font-semibold text-green">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl font-bold text-ink">
                {order.order_number}
              </h1>
              <Badge variant={statusVariant(order.status)}>
                {formatLabel(order.status)}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink2">
              <span>
                {order.created_at
                  ? new Date(order.created_at).toLocaleString("en-NG")
                  : "—"}
              </span>
              <Badge variant="blue">{formatLabel(order.channel)}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextActions[order.status] ? (
              <Button onClick={advanceStatus} disabled={!canAdvance}>
                {nextActions[order.status]}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setIsInvoiceOpen(true)}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Invoice
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-0">
            <div className="border-b border-blue-border px-5 py-4">
              <h2 className="font-display text-2xl font-bold text-ink">
                Order Items
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-blue-pale text-xs uppercase text-ink3">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Qty</th>
                    <th className="px-5 py-3">Unit Price</th>
                    <th className="px-5 py-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-border">
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 font-semibold text-ink">
                        {item.product_name}
                      </td>
                      <td className="px-5 py-4 text-ink2">{item.quantity}</td>
                      <td className="px-5 py-4 text-ink2">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-ink">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-pale font-semibold text-ink">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right">
                      Subtotal
                    </td>
                    <td className="px-5 py-3">{formatCurrency(order.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right">
                      Discount
                    </td>
                    <td className="px-5 py-3">{formatCurrency(order.discount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right">
                      Total
                    </td>
                    <td className="px-5 py-3 font-display text-xl">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="font-display text-xl font-bold text-ink">Customer</h2>
            <p className="mt-3 text-lg font-bold text-ink">
              {order.customer?.full_name ?? order.customer_name}
            </p>
            <p className="mt-1 text-sm text-ink2">
              {order.customer?.phone ?? order.customer_phone ?? "No phone"}
            </p>
            <Badge className="mt-3" variant="blue">
              {formatLabel(order.customer?.customer_type ?? "retail")}
            </Badge>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-ink">Payment</h2>
              <Badge variant={statusVariant(order.payment_status)}>
                {formatLabel(order.payment_status)}
              </Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm text-ink2">
              <div className="flex justify-between">
                <span>Amount paid</span>
                <span className="font-semibold text-green">
                  {formatCurrency(order.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold text-ink">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={() => setIsPaymentOpen(true)}>
              Submit Payment
            </Button>
          </Card>
        </aside>
      </div>

      {isPaymentOpen ? (
        <PaymentModal
          orderId={order.id}
          onClose={() => setIsPaymentOpen(false)}
          onSubmitted={async (text) => {
            setMessage(text);
            setIsPaymentOpen(false);
            await fetchOrder();
          }}
        />
      ) : null}

      {isInvoiceOpen ? (
        <InvoiceModal
          detail={detail}
          onClose={() => setIsInvoiceOpen(false)}
        />
      ) : null}
    </div>
  );
}

function PaymentModal({
  orderId,
  onClose,
  onSubmitted,
}: {
  orderId: string;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    let proofUrl: string | null = null;
    let proofFileName: string | null = null;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const upload = await fetch("/api/payments/upload-proof", {
        method: "POST",
        body: formData,
      });

      if (!upload.ok) {
        const data = (await upload.json()) as { error?: string };
        setError(data.error ?? "Unable to upload proof.");
        setIsSubmitting(false);
        return;
      }

      const data = (await upload.json()) as {
        url: string;
        fileName: string;
      };
      proofUrl = data.url;
      proofFileName = data.fileName;
    }

    const response = await fetch(`/api/orders/${orderId}/submit-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        channel,
        reference,
        proof_url: proofUrl,
        proof_file_name: proofFileName,
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to submit payment.");
      return;
    }

    const data = (await response.json()) as { message: string };
    onSubmitted(data.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <h2 className="font-display text-2xl font-bold text-ink">
          Submit Payment
        </h2>
        <form onSubmit={submitPayment} className="mt-5 space-y-4">
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount"
            required
          />
          <Select value={channel} onChange={(event) => setChannel(event.target.value)}>
            <option value="paystack">Paystack</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="pos">POS</option>
          </Select>
          <Input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Reference number"
            required
          />
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-border bg-blue-pale p-5 text-center text-sm font-semibold text-blue-primary">
            <UploadCloud className="mb-2 h-5 w-5" aria-hidden="true" />
            {file ? file.name : "Upload proof image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Payment"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function InvoiceModal({
  detail,
  onClose,
}: {
  detail: DetailResponse;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-between gap-4 print:hidden">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </Button>
        </div>
        <div className="border border-blue-border p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">
                {detail.tenant.name}
              </h1>
              <p className="mt-1 text-sm text-ink2">
                {detail.tenant.address ?? "Nigeria"}
              </p>
            </div>
            {detail.tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.tenant.logo_url}
                alt={detail.tenant.name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : null}
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs font-bold uppercase text-ink3">
                Invoice
              </p>
              <p className="mt-2 font-mono text-lg font-bold text-blue-primary">
                {detail.order.order_number}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase text-ink3">
                Customer
              </p>
              <p className="mt-2 font-bold text-ink">{detail.order.customer_name}</p>
              <p className="text-sm text-ink2">{detail.order.customer_phone}</p>
            </div>
          </div>
          <table className="mt-8 w-full text-left text-sm">
            <thead className="border-b border-blue-border">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((item) => (
                <tr key={item.id} className="border-b border-blue-border">
                  <td className="py-3">{item.product_name}</td>
                  <td className="py-3">{item.quantity}</td>
                  <td className="py-3">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 text-right">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto mt-6 max-w-sm space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total</span>
              <span>{formatCurrency(detail.order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{formatCurrency(detail.order.amount_paid)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Balance</span>
              <span>{formatCurrency(detail.order.balance)}</span>
            </div>
          </div>
          <p className="mt-10 border-t border-blue-border pt-4 text-center text-xs font-semibold text-ink3">
            Powered by Cardinal OS Markets
          </p>
        </div>
      </div>
    </div>
  );
}
