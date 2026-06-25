"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { CheckCircle2, Phone, Truck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type DispatchOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  expected_delivery_at: string | null;
  created_at: string | null;
  order_items?: { product_name: string; quantity: number }[];
  deliveries?: Delivery[];
};

type Delivery = {
  id: string;
  rider_name: string | null;
  rider_phone: string | null;
  otp_verified: boolean | null;
  dispatched_at: string | null;
  status: string | null;
};

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
    timeStyle: "short",
  }).format(new Date(value));
}

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState<"ready" | "transit">("ready");
  const [readyOrders, setReadyOrders] = useState<DispatchOrder[]>([]);
  const [transitOrders, setTransitOrders] = useState<DispatchOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningOrder, setAssigningOrder] = useState<DispatchOrder | null>(null);
  const [manualDelivery, setManualDelivery] = useState<Delivery | null>(null);
  const [toast, setToast] = useState("");

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    const [ready, transit] = await Promise.all([
      fetch("/api/orders/list?status=packaged", { cache: "no-store" }),
      fetch("/api/orders/list?status=dispatched", { cache: "no-store" }),
    ]);
    if (ready.ok) {
      const data = (await ready.json()) as { orders: DispatchOrder[] };
      setReadyOrders(await hydrateOrders(data.orders));
    }
    if (transit.ok) {
      const data = (await transit.json()) as { orders: DispatchOrder[] };
      setTransitOrders(await hydrateOrders(data.orders));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const activeOrders = useMemo(
    () => (activeTab === "ready" ? readyOrders : transitOrders),
    [activeTab, readyOrders, transitOrders],
  );

  return (
    <div className="flex flex-col gap-5">
      {toast ? (
        <div className="fixed right-4 top-16 z-50 rounded-xl border border-blue-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg">
          {toast}
        </div>
      ) : null}

      <PageHeader title="Dispatch" subtitle="Assign riders and confirm deliveries." />

      <div className="grid grid-cols-2 gap-3">
        {[
          ["ready", "Ready to Ship", readyOrders.length],
          ["transit", "In Transit", transitOrders.length],
        ].map(([value, label, count]) => {
          const active = activeTab === value;
          return (
            <button
              key={value as string}
              type="button"
              onClick={() => setActiveTab(value as "ready" | "transit")}
              className={cn(
                "rounded-xl border p-4 text-left transition active:scale-[0.99]",
                active
                  ? "border-blue-primary bg-blue-primary text-white"
                  : "border-blue-border bg-white text-ink hover:bg-blue-pale",
              )}
            >
              <p className="font-display text-[30px] font-bold leading-none">
                {count}
              </p>
              <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-75">
                {label}
              </p>
            </button>
          );
        })}
      </div>

      <Card className="p-3">
        <div className="flex gap-2 overflow-x-auto">
          {[
            ["ready", "Ready to Ship"],
            ["transit", "In Transit"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setActiveTab(value as "ready" | "transit")}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold",
                activeTab === value
                  ? "border-blue-primary bg-blue-primary text-white"
                  : "border-blue-border bg-white text-ink2 hover:bg-blue-pale",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : activeTab === "ready" ? (
          <ReadyCards orders={activeOrders} onAssign={setAssigningOrder} />
        ) : (
          <TransitCards orders={activeOrders} onManual={setManualDelivery} />
        )}
      </Card>

      {assigningOrder ? (
        <AssignRiderModal
          order={assigningOrder}
          onClose={() => setAssigningOrder(null)}
          onAssigned={async () => {
            setAssigningOrder(null);
            setToast("Rider assigned and customer notified.");
            window.setTimeout(() => setToast(""), 4000);
            await fetchOrders();
          }}
        />
      ) : null}

      {manualDelivery ? (
        <ManualDeliveredModal
          delivery={manualDelivery}
          onClose={() => setManualDelivery(null)}
          onSaved={async () => {
            setManualDelivery(null);
            setToast("Delivery marked as delivered.");
            window.setTimeout(() => setToast(""), 4000);
            await fetchOrders();
          }}
        />
      ) : null}
    </div>
  );
}

function ReadyCards({
  orders,
  onAssign,
}: {
  orders: DispatchOrder[];
  onAssign: (order: DispatchOrder) => void;
}) {
  return (
    <div>
      <div className="border-b border-blue-border px-5 py-4">
        <h2 className="font-display text-[20px] font-bold text-ink">Ready to Ship</h2>
        <p className="mt-1 text-xs text-ink2">Packaged orders waiting for rider assignment.</p>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => onAssign(order)}
            className="rounded-xl border border-blue-border bg-white p-4 text-left transition hover:bg-blue-pale active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-blue-primary">
                  {order.order_number}
                </p>
                <h3 className="mt-1 truncate text-sm font-bold text-ink">
                  {order.customer_name}
                </h3>
              </div>
              <span className="rounded-full bg-blue-light px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-blue-primary">
                Packaged
              </span>
            </div>
            <p className="mt-4 line-clamp-2 text-sm font-semibold text-ink2">
              {order.delivery_address || "No delivery address saved"}
            </p>
            <p className="mt-3 line-clamp-2 text-xs text-ink3">{itemSummary(order)}</p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-blue-border pt-3">
              <span className="font-mono text-xs text-ink2">
                Expected: {formatDate(order.expected_delivery_at)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-primary px-3 py-2 text-xs font-semibold text-white">
                <Truck className="h-3.5 w-3.5" /> Assign
              </span>
            </div>
          </button>
        ))}
        {!orders.length ? (
          <div className="col-span-full px-5 py-12 text-center text-ink2">
            No packaged orders ready to ship.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TransitCards({
  orders,
  onManual,
}: {
  orders: DispatchOrder[];
  onManual: (delivery: Delivery) => void;
}) {
  return (
    <div>
      <div className="border-b border-blue-border px-5 py-4">
        <h2 className="font-display text-[20px] font-bold text-ink">In Transit</h2>
        <p className="mt-1 text-xs text-ink2">Live dispatches awaiting OTP confirmation.</p>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        {orders.map((order) => {
          const delivery = order.deliveries?.[0];
          return (
            <div key={order.id} className="rounded-xl border border-blue-border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold text-blue-primary">
                    {order.order_number}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-ink">{order.customer_name}</h3>
                </div>
                <Badge variant={delivery?.otp_verified ? "green" : "gold"}>
                  {delivery?.otp_verified ? "Verified" : "Pending"}
                </Badge>
              </div>
              <div className="mt-4 rounded-lg border border-blue-border bg-blue-pale p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-ink2">Rider</span>
                  <span className="font-bold text-ink">{delivery?.rider_name ?? "-"}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3">
                  <span className="font-semibold text-ink2">Phone</span>
                  {delivery?.rider_phone ? (
                    <a href={`tel:${delivery.rider_phone}`} className="inline-flex items-center gap-1.5 font-mono font-bold text-blue-primary">
                      <Phone className="h-3.5 w-3.5" /> {delivery.rider_phone}
                    </a>
                  ) : (
                    <span className="text-ink3">-</span>
                  )}
                </div>
                <div className="mt-2 flex justify-between gap-3">
                  <span className="font-semibold text-ink2">Dispatched</span>
                  <span className="font-mono text-xs text-ink2">
                    {formatDate(delivery?.dispatched_at ?? order.created_at)}
                  </span>
                </div>
              </div>
              {delivery ? (
                <Button variant="ghost" onClick={() => onManual(delivery)} className="mt-4 w-full">
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Delivered (Manual)
                </Button>
              ) : null}
            </div>
          );
        })}
        {!orders.length ? (
          <div className="col-span-full px-5 py-12 text-center text-ink2">
            No orders currently in transit.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AssignRiderModal({
  order,
  onClose,
  onAssigned,
}: {
  order: DispatchOrder;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [estimatedDate, setEstimatedDate] = useState("");
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
    <ModalShell title={`Assign Rider - ${order.order_number}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input value={riderName} onChange={(event) => setRiderName(event.target.value)} placeholder="Rider Name" required />
        <Input value={riderPhone} onChange={(event) => setRiderPhone(event.target.value)} placeholder="Rider Phone" required />
        <Input type="date" value={estimatedDate} onChange={(event) => setEstimatedDate(event.target.value)} />
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full">Confirm Assignment</Button>
      </form>
    </ModalShell>
  );
}

function ManualDeliveredModal({
  delivery,
  onClose,
  onSaved,
}: {
  delivery: Delivery;
  onClose: () => void;
  onSaved: () => void;
}) {
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
    <ModalShell title="Manual Delivery Confirmation" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for manual delivery confirmation"
          className="min-h-28 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
          required
        />
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full">Mark Delivered</Button>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/45 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink2 hover:bg-blue-pale">
            ×
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}

async function hydrateOrders(orders: DispatchOrder[]) {
  return Promise.all(
    orders.map(async (order) => {
      const detail = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
      if (!detail.ok) return order;
      const data = (await detail.json()) as {
        items: { product_name: string; quantity: number }[];
        deliveries: Delivery[];
      };
      return {
        ...order,
        order_items: data.items,
        deliveries: data.deliveries,
      };
    }),
  );
}
