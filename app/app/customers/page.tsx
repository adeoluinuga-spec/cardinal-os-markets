"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronDown, Crown, Mail, Pencil, Phone, Plus, Search, Sparkles, UsersRound, X } from "lucide-react";
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
  if (!value) return "Pending";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function relativeTime(value: string | null) {
  if (!value) return "No orders yet";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function dayKey(value: string | null) {
  if (!value) return "unknown";
  return new Date(value).toISOString().slice(0, 10);
}

function dayLabel(key: string) {
  if (key === "unknown") return "Earlier";
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function typeVariant(type: Customer["customer_type"]) {
  if (type === "wholesale") return "gold";
  if (type === "distributor") return "green";
  return "blue";
}

function healthBadge(score: number | null) {
  const value = Number(score ?? 0);
  if (value >= 70) return { label: "Active", variant: "green" as const };
  if (value >= 40) return { label: "Watchlist", variant: "gold" as const };
  return { label: "At Risk", variant: "red" as const };
}

function statusVariant(status: string | null) {
  if (status === "delivered" || status === "confirmed") return "green";
  if (status === "cancelled") return "red";
  if (status === "dispatched" || status === "packaged") return "blue";
  return "gold";
}

function isVip(customer: Customer) {
  return Number(customer.lifetime_value ?? 0) >= 10_000_000;
}

function HealthRing({ score }: { score: number | null }) {
  const value = Math.max(0, Math.min(100, Number(score ?? 0)));
  const color = value >= 70 ? "var(--green)" : value >= 40 ? "var(--gold)" : "#DC2626";
  return (
    <div
      className="grid h-14 w-14 place-items-center rounded-full font-mono text-xs font-bold"
      style={{
        background: `conic-gradient(${color} ${value * 3.6}deg, var(--blue-light) 0deg)`,
      }}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink">
        {value}
      </span>
    </div>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      className="rounded-lg border border-blue-border bg-white px-3 py-2.5"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink3">
        {label}
      </p>
      <p className="mt-1 truncate font-display text-[22px] font-bold leading-none text-ink">
        {value}
      </p>
    </div>
  );
}

function CustomerCard({
  customer,
  selected,
  onSelect,
}: {
  customer: Customer;
  selected: boolean;
  onSelect: () => void;
}) {
  const health = healthBadge(customer.health_score);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-4 rounded-xl border bg-white p-4 text-left transition hover:bg-blue-pale"
      style={{
        borderColor: selected ? "var(--blue)" : "var(--border)",
        boxShadow: selected ? "inset 3px 0 0 var(--blue)" : "none",
      }}
    >
      <HealthRing score={customer.health_score} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-bold text-ink">{customer.full_name}</p>
          <p className="shrink-0 font-mono text-xs font-bold text-ink">
            {formatCurrency(customer.lifetime_value)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={typeVariant(customer.customer_type)}>
            {formatLabel(customer.customer_type)}
          </Badge>
          <Badge variant={health.variant}>{health.label}</Badge>
          {isVip(customer) ? (
            <Badge variant="gold" className="gap-1">
              <Crown className="h-3 w-3" />
              VIP
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 truncate text-xs text-ink2">
          {customer.city ?? "No city"} · {relativeTime(customer.last_order_at)}
        </p>
      </div>
    </button>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<CustomerDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (activeType !== "all") params.set("type", activeType);
    const query = params.toString();
    return `/api/customers/list${query ? `?${query}` : ""}`;
  }, [activeType, search]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(listUrl, { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { customers: Customer[] };
      setCustomers(data.customers);
      if (!selectedId && data.customers[0]) setSelectedId(data.customers[0].id);
    }
    setIsLoading(false);
  }, [listUrl, selectedId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchCustomers(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchCustomers]);

  useEffect(() => {
    if (!selectedId) return;
    void openCustomer(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function openCustomer(customerId: string) {
    setIsDetailLoading(true);
    setAiSummary("");
    const response = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
    if (response.ok) setSelectedDetail((await response.json()) as CustomerDetail);
    setIsDetailLoading(false);
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const response = await fetch("/api/customers/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    if (!selectedDetail?.customer.id) return;
    setIsSummaryLoading(true);
    const response = await fetch("/api/customers/ai-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: selectedDetail.customer.id }),
    });
    if (response.ok) setAiSummary(((await response.json()) as { summary: string }).summary);
    setIsSummaryLoading(false);
  }

  function toggleDay(key: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filteredCustomers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesType = activeType === "all" || customer.customer_type === activeType;
      const haystack = `${customer.full_name} ${customer.phone ?? ""} ${customer.email ?? ""} ${customer.city ?? ""}`.toLowerCase();
      return matchesType && (!needle || haystack.includes(needle));
    });
  }, [activeType, customers, search]);

  const groupedCustomers = useMemo(() => {
    const groups = filteredCustomers.reduce<Record<string, Customer[]>>((acc, customer) => {
      const key = dayKey(customer.created_at);
      acc[key] = acc[key] ?? [];
      acc[key].push(customer);
      return acc;
    }, {});
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredCustomers]);

  const totalLtv = customers.reduce((sum, customer) => sum + Number(customer.lifetime_value ?? 0), 0);
  const avgHealth = customers.length
    ? Math.round(customers.reduce((sum, customer) => sum + Number(customer.health_score ?? 0), 0) / customers.length)
    : 0;
  const churnRisk = customers.filter((customer) => Number(customer.health_score ?? 0) < 40).length;
  const vipCount = customers.filter(isVip).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Customers" subtitle="Manage customer relationships, health, and buying history.">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatChip label="Total Accounts" value={customers.length} accent="var(--blue)" />
        <StatChip label="VIP Accounts" value={vipCount} accent="var(--gold)" />
        <StatChip label="Avg Health" value={`${avgHealth}%`} accent="var(--green)" />
        <StatChip label="Churn Risk" value={churnRisk} accent="#DC2626" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:h-[calc(100vh-220px)] lg:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, phone, email, or city"
                className="pl-9"
              />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveType(tab.value)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    activeType === tab.value
                      ? "border-blue-primary bg-blue-primary text-white"
                      : "border-blue-border bg-white text-ink2 hover:bg-blue-pale",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink3">
              Showing {filteredCustomers.length.toLocaleString()} of {customers.length.toLocaleString()} customers · {formatCurrency(totalLtv)} LTV
            </p>
          </Card>

          <div className="min-h-[420px] flex-1 space-y-3 overflow-y-auto pr-1">
            {isLoading ? (
              [0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-xl border border-blue-border bg-blue-pale"
                />
              ))
            ) : customers.length === 0 ? (
              <EmptyState
                icon={<UsersRound className="h-6 w-6" />}
                title="No customers yet."
                description="Add your first customer to get started."
                className="border-0"
              />
            ) : groupedCustomers.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink2">No customers match this filter.</p>
            ) : (
              groupedCustomers.map(([key, group]) => {
                const collapsed = collapsedDays.has(key);
                return (
                  <div key={key} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleDay(key)}
                      className="sticky top-0 z-10 flex w-full items-center justify-between rounded-lg border border-blue-border bg-white px-3 py-2"
                    >
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink3">
                        {dayLabel(key)}
                      </span>
                      <span className="flex items-center gap-2 font-mono text-[10px] text-ink3">
                        {group.length} customer{group.length === 1 ? "" : "s"}
                        <ChevronDown className={cn("h-3 w-3 transition", collapsed && "-rotate-90")} />
                      </span>
                    </button>
                    {!collapsed
                      ? group.map((customer) => (
                          <CustomerCard
                            key={customer.id}
                            customer={customer}
                            selected={selectedId === customer.id}
                            onSelect={() => setSelectedId(customer.id)}
                          />
                        ))
                      : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="min-h-[520px] overflow-y-auto">
          {isDetailLoading ? (
            <Card className="flex min-h-[420px] items-center justify-center">
              <Spinner className="h-8 w-8" />
            </Card>
          ) : selectedDetail ? (
            <CustomerPanel
              detail={selectedDetail}
              aiSummary={aiSummary}
              isSummaryLoading={isSummaryLoading}
              onAiSummary={() => void fetchAiSummary()}
            />
          ) : (
            <Card className="flex min-h-[420px] items-center justify-center">
              <p className="text-sm text-ink2">Select a customer to view profile.</p>
            </Card>
          )}
        </div>
      </div>

      {isModalOpen ? (
        <AddCustomerModal
          form={form}
          setForm={setForm}
          error={error}
          isSaving={isSaving}
          onClose={() => setIsModalOpen(false)}
          onSubmit={createCustomer}
        />
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
  const health = healthBadge(customer.health_score);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-blue-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-[28px] font-bold leading-tight text-ink">
              {customer.full_name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={typeVariant(customer.customer_type)}>
                {formatLabel(customer.customer_type)}
              </Badge>
              <Badge variant={health.variant}>{health.label}</Badge>
              {customer.city ? <span className="text-sm font-semibold text-ink2">{customer.city}</span> : null}
            </div>
          </div>
          <HealthRing score={customer.health_score} />
        </div>

        <div className="mt-4 rounded-lg border border-blue-border bg-blue-pale p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="font-semibold text-ink2">Phone</span>
            {customer.phone ? (
              <a href={`tel:${customer.phone}`} className="font-mono font-bold text-blue-primary">
                {customer.phone}
              </a>
            ) : (
              <span className="text-ink3">Not saved</span>
            )}
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span className="font-semibold text-ink2">Email</span>
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="truncate font-mono font-bold text-blue-primary">
                {customer.email}
              </a>
            ) : (
              <span className="text-ink3">Not saved</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {customer.phone ? (
            <a className="inline-flex items-center gap-1.5 rounded-md border border-blue-border px-3 py-2 text-xs font-semibold text-ink2 hover:bg-blue-pale" href={`tel:${customer.phone}`}>
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
          ) : null}
          {customer.email ? (
            <a className="inline-flex items-center gap-1.5 rounded-md border border-blue-border px-3 py-2 text-xs font-semibold text-ink2 hover:bg-blue-pale" href={`mailto:${customer.email}`}>
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
          ) : null}
          <button className="inline-flex items-center gap-1.5 rounded-md border border-blue-border px-3 py-2 text-xs font-semibold text-ink2 hover:bg-blue-pale">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
      </div>

      <div className="border-b border-blue-border p-5">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="LTV" value={formatCurrency(customer.lifetime_value)} />
          <MiniStat label="Orders" value={customer.total_orders ?? 0} />
          <MiniStat label="Health" value={`${customer.health_score ?? 0}/100`} />
        </div>
      </div>

      <div className="border-b border-blue-border p-5">
        <div className="rounded-xl border border-blue-border bg-blue-light/70 p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-blue-primary">
            AI Account Intelligence
          </p>
          <p className="mt-2 text-sm leading-6 text-ink">
            {aiSummary || `${customer.full_name} has ${customer.total_orders ?? 0} recorded orders and lifetime value of ${formatCurrency(customer.lifetime_value)}. Use AI summary for a sharper next action.`}
          </p>
          <Button className="mt-4" onClick={onAiSummary}>
            <Sparkles className="h-4 w-4" />
            {isSummaryLoading ? "Thinking..." : "AI Summary"}
          </Button>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink3">
            Recent Orders
          </p>
          <Link
            href={`/app/orders/new?customer_id=${customer.id}`}
            className="inline-flex rounded-md bg-blue-primary px-3 py-2 text-xs font-semibold text-white hover:bg-blue-dark"
          >
            New Order
          </Link>
        </div>
        <div className="space-y-2">
          {orders.length ? (
            orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-blue-border bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs font-bold text-blue-primary">
                    {order.order_number}
                  </p>
                  <Badge variant={statusVariant(order.status)}>
                    {formatLabel(order.status)}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-mono font-semibold text-ink">{formatCurrency(order.total)}</span>
                  <span className="text-ink2">{relativeTime(order.created_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-blue-border p-4 text-sm text-ink2">
              No orders yet for this customer.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-blue-border bg-blue-pale p-3">
      <p className="truncate font-display text-lg font-bold text-ink">{value}</p>
      <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink3">
        {label}
      </p>
    </div>
  );
}

function AddCustomerModal({
  form,
  setForm,
  error,
  isSaving,
  onClose,
  onSubmit,
}: {
  form: typeof emptyCustomerForm;
  setForm: (form: typeof emptyCustomerForm) => void;
  error: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/45 p-4 backdrop-blur-sm">
      <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Add Customer</h2>
            <p className="mt-1 text-sm text-ink2">Create a new customer profile for this tenant.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-blue-pale">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink2">Full Name</span>
            <Input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink2">Phone</span>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} inputMode="tel" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink2">Email</span>
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink2">Address</span>
            <Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink2">City</span>
            <Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink2">Customer Type</span>
            <Select value={form.customer_type} onChange={(event) => setForm({ ...form, customer_type: event.target.value })}>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="distributor">Distributor</option>
            </Select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink2">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="min-h-28 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink3 focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
            />
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">{error}</p> : null}

          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Customer"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
