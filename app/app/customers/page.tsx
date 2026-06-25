"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Crown,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  customer_type: "retail" | "wholesale" | "distributor";
  health_score: number | null;
  lifetime_value: number | null;
  total_orders: number | null;
  last_order_at: string | null;
  notes: string | null;
  created_at: string | null;
};

type CustomerOrder = {
  id: string;
  order_number: string;
  total: number | null;
  status: string | null;
  created_at: string | null;
};

type CustomerDetail = {
  customer: Customer;
  orders: CustomerOrder[];
};

const filterTabs = [
  { label: "All", value: "all" },
  { label: "Retail", value: "retail" },
  { label: "Wholesale", value: "wholesale" },
  { label: "Distributor", value: "distributor" },
];

const emptyCustomerForm = {
  full_name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  customer_type: "retail",
  notes: "",
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
    return "Pending";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function relativeTime(value: string | null) {
  if (!value) {
    return "No orders yet";
  }

  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  if (days < 30) {
    return `${days} days ago`;
  }

  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function typeVariant(type: Customer["customer_type"]) {
  if (type === "wholesale") {
    return "gold";
  }

  if (type === "distributor") {
    return "green";
  }

  return "blue";
}

function healthColor(score: number | null) {
  const value = Number(score ?? 0);

  if (value >= 70) {
    return "border-green text-green bg-green-light";
  }

  if (value >= 40) {
    return "border-orange-500 text-orange-700 bg-orange-50";
  }

  return "border-red-600 text-red-700 bg-red-50";
}

function isVip(customer: Customer) {
  return Number(customer.lifetime_value ?? 0) >= 10_000_000;
}

function isChurnRisk(customer: Customer) {
  return Number(customer.health_score ?? 0) < 40;
}

function statusVariant(status: string | null) {
  if (status === "delivered" || status === "confirmed") {
    return "green";
  }

  if (status === "cancelled") {
    return "red";
  }

  if (status === "dispatched" || status === "packaged") {
    return "blue";
  }

  return "gold";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<CustomerDetail | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyCustomerForm);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (activeType !== "all") {
      params.set("type", activeType);
    }

    const query = params.toString();
    return `/api/customers/list${query ? `?${query}` : ""}`;
  }, [activeType, search]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(listUrl, { cache: "no-store" });

    if (response.ok) {
      const data = (await response.json()) as { customers: Customer[] };
      setCustomers(data.customers);
    }

    setIsLoading(false);
  }, [listUrl]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchCustomers();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchCustomers]);

  async function openCustomer(customerId: string) {
    setIsDetailLoading(true);
    setAiSummary("");
    const response = await fetch(`/api/customers/${customerId}`, {
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as CustomerDetail;
      setSelectedDetail(data);
    }

    setIsDetailLoading(false);
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const response = await fetch("/api/customers/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setIsSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to create customer.");
      return;
    }

    setForm(emptyCustomerForm);
    setIsModalOpen(false);
    await fetchCustomers();
  }

  async function fetchAiSummary() {
    if (!selectedDetail?.customer.id) {
      return;
    }

    setIsSummaryLoading(true);
    const response = await fetch("/api/customers/ai-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customer_id: selectedDetail.customer.id }),
    });

    if (response.ok) {
      const data = (await response.json()) as { summary: string };
      setAiSummary(data.summary);
    }

    setIsSummaryLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage customer relationships, health, and buying history."
      >
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Customer
        </Button>
      </PageHeader>

      <Card className="p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or phone"
            className="pl-9"
          />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveType(tab.value)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-ink2 transition",
                activeType === tab.value
                  ? "bg-blue-primary text-white"
                  : "bg-blue-pale hover:bg-blue-light",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<UsersRound className="h-6 w-6" aria-hidden="true" />}
            title="No customers yet."
            description="Add your first customer to get started."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-blue-pale text-xs uppercase text-ink3">
                <tr>
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-5 py-3 font-bold">Phone</th>
                  <th className="px-5 py-3 font-bold">Type</th>
                  <th className="px-5 py-3 font-bold">Lifetime Value</th>
                  <th className="px-5 py-3 font-bold">Health Score</th>
                  <th className="px-5 py-3 font-bold">Last Order</th>
                  <th className="px-5 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-border">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => void openCustomer(customer.id)}
                    className="cursor-pointer bg-white transition hover:bg-blue-pale"
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-ink">{customer.full_name}</span>
                        {isVip(customer) ? (
                          <Badge variant="gold" className="gap-1">
                            <Crown className="h-3 w-3" aria-hidden="true" />
                            VIP
                          </Badge>
                        ) : null}
                        {isChurnRisk(customer) ? (
                          <Badge variant="red">Churn Risk</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ink2">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={typeVariant(customer.customer_type)}>
                        {formatLabel(customer.customer_type)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">
                      {formatCurrency(customer.lifetime_value)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-xs font-bold",
                          healthColor(customer.health_score),
                        )}
                      >
                        {customer.health_score ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink2">
                      {relativeTime(customer.last_order_at)}
                    </td>
                    <td
                      className="px-5 py-4"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="group relative inline-flex">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-blue-light"
                          aria-label="Customer actions"
                        >
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <div className="invisible absolute right-0 top-9 z-10 w-36 rounded-lg border border-blue-border bg-white p-1 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => void openCustomer(customer.id)}
                            className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-blue-pale"
                          >
                            View
                          </button>
                          <Link
                            href={`/app/orders/new?customer_id=${customer.id}`}
                            className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-blue-pale"
                          >
                            New Order
                          </Link>
                          <button
                            type="button"
                            onClick={() => void openCustomer(customer.id)}
                            className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-blue-pale"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedDetail || isDetailLoading ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-blue-dark/40">
          <button
            type="button"
            className="hidden flex-1 sm:block"
            onClick={() => setSelectedDetail(null)}
            aria-label="Close customer profile"
          />
          <aside className="h-full w-full max-w-[400px] overflow-y-auto bg-white p-5 shadow-2xl shadow-blue-dark/30">
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-blue-pale"
                aria-label="Close customer profile"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {isDetailLoading || !selectedDetail ? (
              <div className="flex min-h-80 items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <CustomerPanel
                detail={selectedDetail}
                aiSummary={aiSummary}
                isSummaryLoading={isSummaryLoading}
                onAiSummary={() => void fetchAiSummary()}
              />
            )}
          </aside>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/45 p-4 backdrop-blur-sm">
          <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">
                  Add Customer
                </h2>
                <p className="mt-1 text-sm text-ink2">
                  Create a new customer profile for this tenant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-blue-pale"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={createCustomer} className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-ink2">
                  Full Name
                </span>
                <Input
                  value={form.full_name}
                  onChange={(event) =>
                    setForm({ ...form, full_name: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink2">
                  Phone
                </span>
                <Input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  inputMode="tel"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink2">
                  Email
                </span>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-ink2">
                  Address
                </span>
                <Input
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink2">
                  City
                </span>
                <Input
                  value={form.city}
                  onChange={(event) =>
                    setForm({ ...form, city: event.target.value })
                  }
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink2">
                  Customer Type
                </span>
                <Select
                  value={form.customer_type}
                  onChange={(event) =>
                    setForm({ ...form, customer_type: event.target.value })
                  }
                >
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="distributor">Distributor</option>
                </Select>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-ink2">
                  Notes
                </span>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  className="min-h-28 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink3 focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
                />
              </label>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 sm:col-span-2">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Customer"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function CustomerPanel({
  detail,
  aiSummary,
  isSummaryLoading,
  onAiSummary,
}: {
  detail: CustomerDetail;
  aiSummary: string;
  isSummaryLoading: boolean;
  onAiSummary: () => void;
}) {
  const { customer, orders } = detail;

  return (
    <div>
      <h2 className="font-display text-3xl font-bold text-ink">
        {customer.full_name}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={typeVariant(customer.customer_type)}>
          {formatLabel(customer.customer_type)}
        </Badge>
        {isVip(customer) ? (
          <Badge variant="gold" className="gap-1">
            <Crown className="h-3 w-3" aria-hidden="true" />
            VIP
          </Badge>
        ) : null}
        {isChurnRisk(customer) ? <Badge variant="red">Churn Risk</Badge> : null}
        {customer.city ? (
          <span className="text-sm font-semibold text-ink2">{customer.city}</span>
        ) : null}
      </div>

      <div className="mt-5 space-y-2 text-sm">
        {customer.phone ? (
          <a
            href={`tel:${customer.phone}`}
            className="flex items-center gap-2 text-blue-primary hover:text-blue-dark"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {customer.phone}
          </a>
        ) : null}
        {customer.email ? (
          <a
            href={`mailto:${customer.email}`}
            className="flex items-center gap-2 text-blue-primary hover:text-blue-dark"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {customer.email}
          </a>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <MiniStat label="LTV" value={formatCurrency(customer.lifetime_value)} />
        <MiniStat label="Orders" value={customer.total_orders ?? 0} />
        <MiniStat label="Health" value={`${customer.health_score ?? 0}/100`} />
      </div>

      <Button className="mt-6 w-full" onClick={onAiSummary}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {isSummaryLoading ? "Thinking..." : "AI Summary"}
      </Button>

      {aiSummary ? (
        <div className="mt-4 rounded-xl border border-blue-border bg-blue-light p-4 text-sm leading-6 text-ink">
          {aiSummary}
        </div>
      ) : null}

      <Link
        href={`/app/orders/new?customer_id=${customer.id}`}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-dark"
      >
        New Order
      </Link>

      <div className="mt-8">
        <h3 className="font-display text-xl font-bold text-ink">
          Order History
        </h3>
        <div className="mt-3 space-y-3">
          {orders.length ? (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-blue-border bg-blue-pale p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm font-bold text-blue-primary">
                    {order.order_number}
                  </p>
                  <Badge variant={statusVariant(order.status)}>
                    {formatLabel(order.status)}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-ink2">
                  <span>{formatCurrency(order.total)}</span>
                  <span>{relativeTime(order.created_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-blue-border p-4 text-sm text-ink2">
              No orders yet for this customer.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-blue-border bg-blue-pale p-3">
      <p className="truncate font-display text-lg font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink3">{label}</p>
    </div>
  );
}
