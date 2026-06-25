"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Phone, Truck } from "lucide-react";
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

function formatDate(value: string | null) {
  if (!value) return "—";
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
      const hydrated = await hydrateOrders(data.orders);
      setReadyOrders(hydrated);
    }
    if (transit.ok) {
      const data = (await transit.json()) as { orders: DispatchOrder[] };
      const hydrated = await hydrateOrders(data.orders);
      setTransitOrders(hydrated);
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
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-4 top-16 z-50 rounded-xl border border-blue-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg">
          {toast}
        </div>
      ) : null}
      <PageHeader title="Dispatch" subtitle="Assign riders and confirm deliveries." />
      <Card className="p-3">
        <div className="flex gap-2">
          {[
            ["ready", "Ready to Ship"],
            ["transit", "In Transit"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setActiveTab(value as "ready" | "transit")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold",
                activeTab === value
                  ? "bg-blue-primary text-white"
                  : "bg-blue-pale text-ink2 hover:bg-blue-light",
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
          <ReadyTable orders={activeOrders} onAssign={setAssigningOrder} />
        ) : (
          <TransitTable
            orders={activeOrders}
            onManual={(delivery) => setManualDelivery(delivery)}
          />
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

function ReadyTable({
  orders,
  onAssign,
}: {
  orders: DispatchOrder[];
  onAssign: (order: DispatchOrder) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-blue-pale text-xs uppercase text-ink3">
          <tr>
            <th className="px-5 py-3">Order #</th>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">Address</th>
            <th className="px-5 py-3">Items</th>
            <th className="px-5 py-3">Expected delivery</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-border">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-5 py-4 font-mono font-bold text-blue-primary">
                {order.order_number}
              </td>
              <td className="px-5 py-4 font-semibold text-ink">
                {order.customer_name}
              </td>
              <td className="px-5 py-4 text-ink2">{order.delivery_address}</td>
              <td className="px-5 py-4 text-ink2">{itemSummary(order)}</td>
              <td className="px-5 py-4 text-ink2">
                {formatDate(order.expected_delivery_at)}
              </td>
              <td className="px-5 py-4">
                <Button onClick={() => onAssign(order)}>
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  Assign Rider
                </Button>
              </td>
            </tr>
          ))}
          {!orders.length ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-ink2">
                No packaged orders ready to ship.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function TransitTable({
  orders,
  onManual,
}: {
  orders: DispatchOrder[];
  onManual: (delivery: Delivery) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-blue-pale text-xs uppercase text-ink3">
          <tr>
            <th className="px-5 py-3">Order #</th>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">Rider name</th>
            <th className="px-5 py-3">Rider phone</th>
            <th className="px-5 py-3">Dispatched time</th>
            <th className="px-5 py-3">OTP status</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-border">
          {orders.map((order) => {
            const delivery = order.deliveries?.[0];
            return (
              <tr key={order.id}>
                <td className="px-5 py-4 font-mono font-bold text-blue-primary">
                  {order.order_number}
                </td>
                <td className="px-5 py-4 font-semibold text-ink">
                  {order.customer_name}
                </td>
                <td className="px-5 py-4 text-ink2">{delivery?.rider_name ?? "—"}</td>
                <td className="px-5 py-4">
                  {delivery?.rider_phone ? (
                    <a
                      href={`tel:${delivery.rider_phone}`}
                      className="inline-flex items-center gap-2 text-blue-primary"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {delivery.rider_phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-4 text-ink2">
                  {formatDate(delivery?.dispatched_at ?? order.created_at)}
                </td>
                <td className="px-5 py-4">
                  <Badge variant={delivery?.otp_verified ? "green" : "gold"}>
                    {delivery?.otp_verified ? "Verified" : "Pending"}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  {delivery ? (
                    <Button variant="ghost" onClick={() => onManual(delivery)}>
                      Mark Delivered (Manual)
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
          {!orders.length ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-ink2">
                No orders currently in transit.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
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
    <ModalShell title={`Assign Rider — ${order.order_number}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          value={riderName}
          onChange={(event) => setRiderName(event.target.value)}
          placeholder="Rider Name"
          required
        />
        <Input
          value={riderPhone}
          onChange={(event) => setRiderPhone(event.target.value)}
          placeholder="Rider Phone"
          required
        />
        <Input
          type="date"
          value={estimatedDate}
          onChange={(event) => setEstimatedDate(event.target.value)}
        />
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full">
          Confirm Assignment
        </Button>
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
        <Button type="submit" className="w-full">
          Mark Delivered
        </Button>
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink2 hover:bg-blue-pale"
          >
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
      const detail = await fetch(`/api/orders/${order.id}`, {
        cache: "no-store",
      });

      if (!detail.ok) {
        return order;
      }

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
