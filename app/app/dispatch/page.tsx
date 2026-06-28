"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Package,
  Phone,
  RefreshCw,
  Search,
  Square,
  Truck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type TabId = "queue" | "packaged" | "active" | "delivered";

type DispatchOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  expected_delivery_at: string | null;
  created_at: string | null;
  status: string | null;
  total: number | null;
  tracking_token?: string | null;
  order_items?: { product_name: string; quantity: number; subtotal?: number }[];
  deliveries?: Delivery[];
};

type Delivery = {
  id: string;
  rider_name: string | null;
  rider_phone: string | null;
  otp_verified: boolean | null;
  proof_photo_url?: string | null;
  dispatched_at: string | null;
  delivered_at?: string | null;
  status: string | null;
};

const tabConfig: { id: TabId; label: string; empty: string }[] = [
  { id: "queue", label: "Dispatch Queue", empty: "No confirmed orders awaiting packaging." },
  { id: "packaged", label: "Packaged Queue", empty: "No packaged orders ready for rider assignment." },
  { id: "active", label: "Active Deliveries", empty: "No orders are currently in transit." },
  { id: "delivered", label: "Delivered", empty: "No delivered orders in this date range." },
];

function itemSummary(order: DispatchOrder) {
  return (
    order.order_items
      ?.map((item) => `${item.product_name} x${item.quantity}`)
      .join(", ") || "No items"
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoInput() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

export default function DispatchPage() {
  const [tab, setTab] = useState<TabId>("queue");
  const [orders, setOrders] = useState<Record<TabId, DispatchOrder[]>>({
    queue: [],
    packaged: [],
    active: [],
    delivered: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgoInput());
  const [dateTo, setDateTo] = useState(todayInput());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [toast, setToast] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const statusMap: Record<TabId, string> = {
      queue: "confirmed",
      packaged: "packaged",
      active: "dispatched",
      delivered: "delivered",
    };

    const entries = await Promise.all(
      (Object.keys(statusMap) as TabId[]).map(async (key) => {
        const response = await fetch(`/api/orders/list?status=${statusMap[key]}`, {
          cache: "no-store",
        });
        if (!response.ok) return [key, []] as const;
        const data = (await response.json()) as { orders: DispatchOrder[] };
        return [key, await hydrateOrders(data.orders)] as const;
      }),
    );

    setOrders(Object.fromEntries(entries) as Record<TabId, DispatchOrder[]>);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    setBulkError("");
    setBulkMessage("");
  }, [tab, search, dateFrom, dateTo, pageSize]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders[tab].filter((order) => {
      const date = order.expected_delivery_at ?? order.created_at;
      const dateKey = date ? new Date(date).toISOString().slice(0, 10) : null;
      const inDateRange =
        tab === "delivered" || tab === "active"
          ? (!dateKey || (dateKey >= dateFrom && dateKey <= dateTo))
          : true;
      if (!inDateRange) return false;
      if (!term) return true;
      return (
        order.order_number.toLowerCase().includes(term) ||
        order.customer_name.toLowerCase().includes(term) ||
        (order.customer_phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [dateFrom, dateTo, orders, search, tab]);

  const pagedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    const visibleIds = pagedOrders.map((order) => order.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function packageSelected() {
    if (!selectedIds.size) return;
    setBulkError("");
    setBulkMessage("");
    const ids = Array.from(selectedIds);
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/orders/${id}/advance`, { method: "POST" }).then((response) => response.ok),
      ),
    );
    const failed = results.filter((ok) => !ok).length;
    setSelectedIds(new Set());
    await fetchOrders();
    if (failed) {
      setBulkError(`${failed} order(s) could not be packaged.`);
      return;
    }
    setBulkMessage(`${ids.length} order(s) moved to Packaged Queue.`);
    setTab("packaged");
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  }

  function downloadCsv() {
    const csv = [
      ["Order #", "Customer", "Phone", "Status", "Rider", "Rider Phone", "Address", "Total"],
      ...filteredOrders.map((order) => {
        const delivery = order.deliveries?.[0];
        return [
          order.order_number,
          order.customer_name,
          order.customer_phone ?? "",
          order.status ?? "",
          delivery?.rider_name ?? "",
          delivery?.rider_phone ?? "",
          order.delivery_address ?? "",
          String(order.total ?? 0),
        ];
      }),
    ]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `dispatch-${tab}-${todayInput()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="fixed right-4 top-16 z-50 rounded-xl border border-blue-border bg-white px-4 py-3 text-sm font-bold text-ink shadow-lg">
          {toast}
        </div>
      ) : null}

      <PageHeader title="Dispatch" subtitle="Package, route, and confirm deliveries.">
        <Button variant="ghost" onClick={() => void fetchOrders()}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
        <Button variant="ghost" onClick={downloadCsv}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-4">
        {tabConfig.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                active
                  ? "border-blue-primary bg-white shadow-sm"
                  : "border-blue-border bg-white/70 hover:bg-white",
              )}
            >
              <p className="font-display text-3xl font-bold text-ink">
                {orders[item.id].length}
              </p>
              <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink3">
                {item.label}
              </p>
            </button>
          );
        })}
      </section>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, phone, or order number"
              className="pl-9"
            />
          </div>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="h-10 rounded-lg border border-blue-border bg-white px-3 text-sm font-semibold text-ink outline-none"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </Card>

      {(tab === "queue" || tab === "packaged") && filteredOrders.length > 0 ? (
        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">
                {tab === "queue" ? "Bulk package queue orders" : "Build a delivery route"}
              </p>
              <p className="mt-1 text-xs text-ink3">
                {tab === "queue"
                  ? "Select confirmed orders that are physically ready, then move them to Packaged Queue."
                  : "Select packaged orders and assign them to one rider."}
              </p>
            </div>
            <button type="button" onClick={selectVisible} className="secondary-action">
              <CheckSquare className="h-4 w-4" />
              {pagedOrders.every((order) => selectedIds.has(order.id)) ? "Clear page" : "Select page"}
            </button>
          </div>
        </Card>
      ) : null}

      {selectedIds.size > 0 ? (
        <Card className="sticky top-16 z-20 border-blue-primary bg-white p-4 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-bold text-ink">{selectedIds.size} order(s) selected</p>
              <p className="text-xs text-ink3">
                {tab === "queue" ? "Move selected orders to packaged." : "Assign selected packaged orders to a rider."}
              </p>
            </div>
            {tab === "queue" ? (
              <div className="flex gap-2">
                <button className="secondary-action" onClick={() => setSelectedIds(new Set())}>Clear</button>
                <button className="primary-action" onClick={packageSelected}>Move to Packaged Queue</button>
              </div>
            ) : tab === "packaged" ? (
              <BulkAssignForm
                selectedIds={selectedIds}
                assigning={assigning}
                setAssigning={setAssigning}
                onAssigned={async (count) => {
                  setSelectedIds(new Set());
                  await fetchOrders();
                  setTab("active");
                  showToast(`${count} order(s) assigned to rider.`);
                }}
              />
            ) : null}
          </div>
          {bulkError ? <p className="mt-3 text-sm font-bold text-red-700">{bulkError}</p> : null}
          {bulkMessage ? <p className="mt-3 text-sm font-bold text-green">{bulkMessage}</p> : null}
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : pagedOrders.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <Package className="h-8 w-8 text-ink3" />
            <p className="font-bold text-ink2">{tabConfig.find((item) => item.id === tab)?.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-blue-border">
            {pagedOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                selectable={tab === "queue" || tab === "packaged"}
                selected={selectedIds.has(order.id)}
                onToggle={() => toggleSelected(order.id)}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </Card>

      <Pagination page={page} totalPages={totalPages} total={filteredOrders.length} onPage={setPage} />

      <div className="fixed inset-0 z-50" style={{ pointerEvents: selectedOrder ? "auto" : "none" }}>
        <div
          className={cn("absolute inset-0 bg-blue-dark/50 transition-opacity", selectedOrder ? "opacity-100" : "opacity-0")}
          onClick={() => setSelectedOrder(null)}
        />
        <aside
          className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl transition-transform duration-300"
          style={{ transform: selectedOrder ? "translateX(0)" : "translateX(100%)" }}
        >
          {selectedOrder ? (
            <OrderDrawer
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onRefresh={async (message) => {
                setSelectedOrder(null);
                await fetchOrders();
                showToast(message);
              }}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function OrderRow({
  order,
  selectable,
  selected,
  onToggle,
  onClick,
}: {
  order: DispatchOrder;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const delivery = order.deliveries?.[0];
  return (
    <div className={cn("flex items-center bg-white", selected && "bg-blue-pale")}>
      {selectable ? (
        <button
          type="button"
          onClick={onToggle}
          className="grid min-h-20 w-12 place-items-center text-blue-primary"
          aria-label={`Select ${order.order_number}`}
        >
          {selected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
        </button>
      ) : null}
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left hover:bg-blue-pale">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-primary">{order.order_number}</span>
            <StatusBadge order={order} />
          </div>
          <p className="mt-1 truncate text-sm font-bold text-ink">{order.customer_name}</p>
          <p className="mt-0.5 truncate text-xs text-ink3">{order.delivery_address || "No delivery address"}</p>
        </div>
        <div className="hidden min-w-40 text-right sm:block">
          <p className="font-mono text-xs font-bold text-ink2">{formatCurrency(order.total)}</p>
          <p className="mt-1 text-xs text-ink3">
            {delivery?.rider_name ? `${delivery.rider_name} · ${delivery.rider_phone ?? ""}` : `${order.order_items?.length ?? 0} item(s)`}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink3" />
      </button>
    </div>
  );
}

function StatusBadge({ order }: { order: DispatchOrder }) {
  const delivery = order.deliveries?.[0];
  if (order.status === "delivered") return <Badge variant="green">Delivered</Badge>;
  if (order.status === "dispatched") {
    return <Badge variant={delivery?.otp_verified ? "green" : "gold"}>{delivery?.otp_verified ? "OTP Verified" : "In Transit"}</Badge>;
  }
  if (order.status === "packaged") return <Badge variant="gold">Packaged</Badge>;
  return <Badge variant="blue">Confirmed</Badge>;
}

function BulkAssignForm({
  selectedIds,
  assigning,
  setAssigning,
  onAssigned,
}: {
  selectedIds: Set<string>;
  assigning: boolean;
  setAssigning: (value: boolean) => void;
  onAssigned: (count: number) => void;
}) {
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [estimatedDate, setEstimatedDate] = useState(todayInput());
  const [error, setError] = useState("");

  async function assign() {
    if (!riderName || !riderPhone) return;
    setError("");
    setAssigning(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.all(
      ids.map(async (orderId) => {
        const response = await fetch("/api/dispatch/assign-rider", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            rider_name: riderName,
            rider_phone: riderPhone,
            estimated_delivery_date: estimatedDate,
          }),
        });
        return response.ok;
      }),
    );
    setAssigning(false);
    const failed = results.filter((ok) => !ok).length;
    if (failed) {
      setError(`${failed} order(s) could not be assigned.`);
      return;
    }
    onAssigned(ids.length);
  }

  return (
    <div className="grid w-full gap-2 lg:grid-cols-[1fr_150px_160px_auto]">
      <Input value={riderName} onChange={(event) => setRiderName(event.target.value)} placeholder="Rider name" />
      <Input value={riderPhone} onChange={(event) => setRiderPhone(event.target.value)} placeholder="Phone" />
      <Input type="date" value={estimatedDate} onChange={(event) => setEstimatedDate(event.target.value)} />
      <button type="button" className="primary-action" disabled={assigning || !riderName || !riderPhone} onClick={assign}>
        {assigning ? "Assigning..." : "Assign route"}
      </button>
      {error ? <p className="text-sm font-bold text-red-700 lg:col-span-4">{error}</p> : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-ink3">{total} order(s)</p>
      <div className="flex items-center gap-2">
        <button className="secondary-action" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="font-mono text-xs font-bold text-ink2">
          {page} / {totalPages}
        </span>
        <button className="secondary-action" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function OrderDrawer({
  order,
  onClose,
  onRefresh,
}: {
  order: DispatchOrder;
  onClose: () => void;
  onRefresh: (message: string) => void;
}) {
  const delivery = order.deliveries?.[0];
  const [assignOpen, setAssignOpen] = useState(order.status === "packaged");
  const [manualOpen, setManualOpen] = useState(false);

  async function markPackaged() {
    const response = await fetch(`/api/orders/${order.id}/advance`, { method: "POST" });
    if (response.ok) onRefresh("Order moved to Packaged Queue.");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-blue-border p-5">
        <div>
          <p className="font-mono text-xs font-bold text-blue-primary">{order.order_number}</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-ink">{order.customer_name}</h2>
          <p className="mt-1 text-sm text-ink3">{order.delivery_address || "No delivery address saved"}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg text-ink2 hover:bg-blue-pale">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          <InfoTile label="Status"><StatusBadge order={order} /></InfoTile>
          <InfoTile label="Value">{formatCurrency(order.total)}</InfoTile>
          <InfoTile label="Expected">{formatDate(order.expected_delivery_at)}</InfoTile>
          <InfoTile label="Phone">{order.customer_phone ? <a href={`tel:${order.customer_phone}`} className="text-blue-primary">{order.customer_phone}</a> : "-"}</InfoTile>
        </div>
        <div className="rounded-xl border border-blue-border bg-white p-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink3">Items</p>
          <p className="mt-2 text-sm font-semibold text-ink2">{itemSummary(order)}</p>
        </div>
        {delivery ? (
          <div className="rounded-xl border border-blue-border bg-white p-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink3">Rider</p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-bold text-ink">{delivery.rider_name ?? "-"}</p>
              {delivery.rider_phone ? (
                <a href={`tel:${delivery.rider_phone}`} className="inline-flex items-center gap-2 font-mono font-bold text-blue-primary">
                  <Phone className="h-4 w-4" /> {delivery.rider_phone}
                </a>
              ) : null}
              <p className="text-ink3">Dispatched {formatDateTime(delivery.dispatched_at)}</p>
              <p className="text-ink3">OTP {delivery.otp_verified ? "verified" : "pending"}</p>
            </div>
          </div>
        ) : null}
        {order.status === "confirmed" ? (
          <Button onClick={markPackaged} className="w-full">
            <Package className="h-4 w-4" />
            Mark Packaged
          </Button>
        ) : null}
        {order.status === "packaged" ? (
          <Button variant="ghost" onClick={() => setAssignOpen((value) => !value)} className="w-full">
            <Truck className="h-4 w-4" />
            Assign Rider
          </Button>
        ) : null}
        {assignOpen && order.status === "packaged" ? (
          <AssignSingleForm order={order} onAssigned={() => onRefresh("Rider assigned and customer notified.")} />
        ) : null}
        {order.status === "dispatched" && delivery ? (
          <>
            <Button variant="ghost" onClick={() => setManualOpen((value) => !value)} className="w-full">
              <CheckCircle2 className="h-4 w-4" />
              Mark Delivered (Manual)
            </Button>
            {manualOpen ? (
              <ManualDeliveredForm delivery={delivery} onSaved={() => onRefresh("Delivery marked as delivered.")} />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function InfoTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-border bg-blue-pale p-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink3">{label}</p>
      <div className="mt-1 text-sm font-bold text-ink">{children}</div>
    </div>
  );
}

function AssignSingleForm({ order, onAssigned }: { order: DispatchOrder; onAssigned: () => void }) {
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [estimatedDate, setEstimatedDate] = useState(order.expected_delivery_at ?? todayInput());
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/dispatch/assign-rider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.id,
        rider_name: riderName,
        rider_phone: riderPhone,
        estimated_delivery_date: estimatedDate,
      }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to assign rider.");
      return;
    }
    onAssigned();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-blue-border bg-blue-pale p-4">
      <div className="grid gap-3">
        <Input value={riderName} onChange={(event) => setRiderName(event.target.value)} placeholder="Rider name" required />
        <Input value={riderPhone} onChange={(event) => setRiderPhone(event.target.value)} placeholder="Rider phone" required />
        <Input type="date" value={estimatedDate} onChange={(event) => setEstimatedDate(event.target.value)} />
        {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
        <Button type="submit">Confirm Assignment</Button>
      </div>
    </form>
  );
}

function ManualDeliveredForm({ delivery, onSaved }: { delivery: Delivery; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/dispatch/mark-delivered", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery_id: delivery.id, reason }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to mark delivered.");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-blue-border bg-blue-pale p-4">
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason for manual delivery confirmation"
        className="field min-h-28 py-3"
        required
      />
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
      <Button type="submit" className="mt-3 w-full">Mark Delivered</Button>
    </form>
  );
}

async function hydrateOrders(orders: DispatchOrder[]) {
  return Promise.all(
    orders.map(async (order) => {
      const detail = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
      if (!detail.ok) return order;
      const data = (await detail.json()) as {
        order?: DispatchOrder;
        items?: { product_name: string; quantity: number; subtotal?: number }[];
        deliveries?: Delivery[];
      };
      return {
        ...order,
        ...(data.order ?? {}),
        order_items: data.items ?? order.order_items,
        deliveries: data.deliveries ?? order.deliveries,
      };
    }),
  );
}
