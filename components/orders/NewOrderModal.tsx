"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  MessageCircle,
  Monitor,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string | null;
  city?: string | null;
  customer_type?: string | null;
  health_score?: number | null;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit_price: number | null;
  stock_quantity: number | null;
  image_urls?: string[] | null;
};

type OrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  stock_quantity: number;
  image_url?: string | null;
};

type Step = 1 | 2 | 3 | 4 | 5 | "success";

const steps = ["Customer", "Channel", "Products", "Delivery", "Review"];

const channels = [
  { label: "WhatsApp", value: "whatsapp", icon: MessageCircle, color: "#2E7D52" },
  { label: "Walk-in", value: "walk_in", icon: Store, color: "#1A4A8B" },
  { label: "Phone", value: "phone", icon: Phone, color: "#2558A8" },
  { label: "Instagram", value: "instagram", icon: Camera, color: "#C13584" },
  { label: "Website", value: "website", icon: Globe, color: "#6D5BD0" },
  { label: "Manual", value: "manual", icon: Monitor, color: "#4A5068" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function StepBar({ step }: { step: Step }) {
  const numeric = typeof step === "number" ? step : 5;
  return (
    <div className="mb-6 flex items-center">
      {steps.map((label, index) => {
        const position = index + 1;
        const done = numeric > position;
        const active = numeric === position;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition",
                  done && "bg-blue-primary text-white",
                  active && "bg-white text-blue-primary ring-4 ring-blue-light",
                  !done && !active && "bg-blue-border text-ink3",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : position}
              </div>
              <span
                className={cn(
                  "hidden whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.08em] sm:block",
                  active || done ? "text-ink" : "text-ink3",
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mx-2 mb-4 h-px flex-1",
                  numeric > position ? "bg-blue-primary" : "bg-blue-border",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function NewOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    full_name: "",
    phone: "",
    email: "",
    city: "",
  });
  const [channel, setChannel] = useState("whatsapp");
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [createdOrderNumber, setCreatedOrderNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.quantity * item.unit_price, 0),
    [items],
  );
  const total = Math.max(
    0,
    subtotal -
      Number(discount || 0) +
      Number(vatAmount || 0) +
      Number(deliveryFee || 0),
  );

  useEffect(() => {
    if (!open || selectedCustomer) return;

    const timeout = window.setTimeout(async () => {
      const response = await fetch(
        `/api/customers/list?search=${encodeURIComponent(customerSearch)}`,
        { cache: "no-store" },
      );

      if (response.ok) {
        const data = (await response.json()) as { customers: Customer[] };
        setCustomers(data.customers.slice(0, 7));
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [customerSearch, open, selectedCustomer]);

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(async () => {
      const response = await fetch(
        `/api/products/search?search=${encodeURIComponent(productSearch)}`,
        { cache: "no-store" },
      );

      if (response.ok) {
        const data = (await response.json()) as { products: Product[] };
        setProducts(data.products.slice(0, 8));
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [open, productSearch]);

  if (!open) return null;

  function resetAndClose() {
    setStep(1);
    setCustomerSearch("");
    setCustomers([]);
    setSelectedCustomer(null);
    setShowNewCustomer(false);
    setNewCustomer({ full_name: "", phone: "", email: "", city: "" });
    setChannel("whatsapp");
    setProductSearch("");
    setItems([]);
    setDiscount(0);
    setVatAmount(0);
    setDeliveryFee(0);
    setDeliveryAddress("");
    setExpectedDeliveryAt("");
    setNotes("");
    setError("");
    setCreatedOrderNumber("");
    onClose();
  }

  async function createInlineCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/customers/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: newCustomer.full_name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        city: newCustomer.city,
        customer_type: "retail",
      }),
    });

    const data = (await response.json()) as { customer?: Customer; error?: string };
    if (!response.ok || !data.customer) {
      setError(data.error ?? "Unable to create customer.");
      return;
    }

    setSelectedCustomer(data.customer);
    setCustomerSearch(data.customer.full_name);
    setShowNewCustomer(false);
    setStep(2);
  }

  function addProduct(product: Product) {
    if (items.some((item) => item.product_id === product.id)) return;

    setItems((current) => [
      ...current,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: Number(product.unit_price ?? 0),
        stock_quantity: Number(product.stock_quantity ?? 0),
        image_url: product.image_urls?.[0] ?? null,
      },
    ]);
    setProductSearch("");
  }

  function canAdvance() {
    if (step === 1) return Boolean(selectedCustomer);
    if (step === 2) return Boolean(channel);
    if (step === 3) return items.length > 0;
    if (step === 4) return true;
    return false;
  }

  function advance() {
    setError("");
    if (!canAdvance()) {
      if (step === 1) setError("Select or create a customer first.");
      if (step === 3) setError("Add at least one product.");
      return;
    }
    if (step === 1) setStep(2);
    if (step === 2) setStep(3);
    if (step === 3) setStep(4);
    if (step === 4) setStep(5);
  }

  function back() {
    setError("");
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
    if (step === 4) setStep(3);
    if (step === 5) setStep(4);
  }

  async function submitOrder() {
    if (!selectedCustomer || items.length === 0) return;
    setError("");
    setIsSubmitting(true);
    const response = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.full_name,
        customer_phone: selectedCustomer.phone,
        channel,
        items,
        discount,
        vat_amount: vatAmount,
        delivery_fee: deliveryFee,
        delivery_address: deliveryAddress,
        expected_delivery_at: expectedDeliveryAt,
        notes,
      }),
    });
    setIsSubmitting(false);

    const data = (await response.json()) as {
      order?: { order_number?: string };
      error?: string;
    };
    if (!response.ok) {
      setError(data.error ?? "Unable to create order.");
      return;
    }

    setCreatedOrderNumber(data.order?.order_number ?? "Order created");
    setStep("success");
    onCreated();
  }

  const selectedChannel = channels.find((item) => item.value === channel);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-blue-dark/60 backdrop-blur-sm" onClick={resetAndClose} />
      <div className="relative z-10 flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        {step !== "success" ? (
          <div className="flex items-center justify-between border-b border-blue-border px-4 py-4 sm:px-6">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-blue-primary">
                Step {step} of 5
              </p>
              <h2 className="font-display text-2xl font-bold text-ink">New Order</h2>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="grid h-10 w-10 place-items-center rounded-lg text-ink2 hover:bg-blue-pale"
              aria-label="Close new order modal"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {step !== "success" ? <StepBar step={step} /> : null}

          {step === 1 ? (
            <section className="space-y-4">
              {selectedCustomer ? (
                <SelectedCustomerCard
                  customer={selectedCustomer}
                  onChange={() => setSelectedCustomer(null)}
                />
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
                    <input
                      autoFocus
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      placeholder="Search customer by name or phone"
                      className="min-h-12 w-full rounded-xl border border-blue-border bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-primary focus:ring-4 focus:ring-blue-light"
                    />
                  </div>
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.full_name);
                          setStep(2);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-blue-border bg-white p-4 text-left transition hover:bg-blue-pale"
                      >
                        <HealthDot score={customer.health_score ?? 50} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-ink">{customer.full_name}</p>
                          <p className="mt-0.5 text-xs text-ink3">
                            {[customer.city, customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-ink3" />
                      </button>
                    ))}
                  </div>
                  {!showNewCustomer ? (
                    <button
                      type="button"
                      onClick={() => setShowNewCustomer(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-border py-3 text-sm font-bold text-blue-primary transition hover:bg-blue-pale"
                    >
                      <Plus className="h-4 w-4" />
                      New Customer
                    </button>
                  ) : (
                    <form
                      onSubmit={createInlineCustomer}
                      className="rounded-xl border border-blue-border bg-blue-pale p-4"
                    >
                      <p className="mb-3 text-sm font-bold text-ink">New Customer</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input className="field" required placeholder="Full name" value={newCustomer.full_name} onChange={(event) => setNewCustomer({ ...newCustomer, full_name: event.target.value })} />
                        <input className="field" placeholder="Phone" value={newCustomer.phone} onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })} />
                        <input className="field" type="email" placeholder="Email" value={newCustomer.email} onChange={(event) => setNewCustomer({ ...newCustomer, email: event.target.value })} />
                        <input className="field" placeholder="City" value={newCustomer.city} onChange={(event) => setNewCustomer({ ...newCustomer, city: event.target.value })} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => setShowNewCustomer(false)} className="secondary-action flex-1">Cancel</button>
                        <button type="submit" className="primary-action flex-1">Save & Select</button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {channels.map((item) => {
                const Icon = item.icon;
                const active = channel === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setChannel(item.value)}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-2xl border-2 bg-white py-6 transition active:scale-95",
                      active ? "border-blue-primary shadow-sm" : "border-blue-border hover:bg-blue-pale",
                    )}
                    style={{ boxShadow: active ? `0 0 0 4px ${item.color}18` : undefined }}
                  >
                    <span
                      className="grid h-11 w-11 place-items-center rounded-xl text-white"
                      style={{ background: active ? item.color : "#CAD8EC", color: active ? "#fff" : "#414A63" }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-bold text-ink">{item.label}</span>
                  </button>
                );
              })}
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search products by name or SKU"
                  className="min-h-12 w-full rounded-xl border border-blue-border bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-primary focus:ring-4 focus:ring-blue-light"
                />
                {productSearch ? (
                  <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-blue-border bg-white shadow-xl">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex w-full items-center gap-3 border-b border-blue-border px-4 py-3 text-left last:border-b-0 hover:bg-blue-pale"
                      >
                        {product.image_urls?.[0] ? (
                          <img src={product.image_urls[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-pale text-xs font-bold text-blue-primary">SKU</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">{product.name}</span>
                          <span className="block font-mono text-xs text-ink3">
                            {product.sku ?? "No SKU"} · Stock {product.stock_quantity ?? 0}
                          </span>
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-primary">{formatCurrency(Number(product.unit_price ?? 0))}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.product_id} className="rounded-xl border border-blue-border bg-white p-3">
                    <div className="flex gap-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-14 w-14 place-items-center rounded-lg bg-blue-pale text-xs font-bold text-blue-primary">Item</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">{item.product_name}</p>
                        <p className="mt-0.5 font-mono text-xs text-ink3">
                          Stock {item.stock_quantity} · Saved retail price {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setItems((current) => current.filter((row) => row.product_id !== item.product_id))}
                        className="grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.unit_price <= 0 ? (
                      <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                        No retail price is saved for this product yet. Enter the unit price for this order.
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-[96px_1fr_1fr]">
                      <label>
                        <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink3">
                          Qty
                        </span>
                        <input className="field" type="number" min={1} value={item.quantity} onChange={(event) => setItems((current) => current.map((row) => row.product_id === item.product_id ? { ...row, quantity: Number(event.target.value) } : row))} />
                      </label>
                      <label>
                        <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink3">
                          Unit price
                        </span>
                        <input className="field" type="number" min={0} value={item.unit_price} onChange={(event) => setItems((current) => current.map((row) => row.product_id === item.product_id ? { ...row, unit_price: Number(event.target.value) } : row))} />
                      </label>
                      <div>
                        <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink3">
                          Line total
                        </span>
                        <div className="flex min-h-10 items-center justify-end rounded-lg bg-blue-pale px-3 font-mono text-sm font-bold text-ink">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Totals
                subtotal={subtotal}
                discount={discount}
                vatAmount={vatAmount}
                deliveryFee={deliveryFee}
                total={total}
                onDiscount={setDiscount}
                onVatAmount={setVatAmount}
                onDeliveryFee={setDeliveryFee}
              />
            </section>
          ) : null}

          {step === 4 ? (
            <section className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink2">Delivery address</span>
                <input className="field min-h-12" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Customer delivery address" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink2">Expected delivery date</span>
                <input className="field min-h-12" type="date" value={expectedDeliveryAt} onChange={(event) => setExpectedDeliveryAt(event.target.value)} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink2">VAT</span>
                  <input className="field min-h-12" type="number" min={0} value={vatAmount} onChange={(event) => setVatAmount(Number(event.target.value))} placeholder="0" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink2">Delivery fee</span>
                  <input className="field min-h-12" type="number" min={0} value={deliveryFee} onChange={(event) => setDeliveryFee(Number(event.target.value))} placeholder="0" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink2">Notes</span>
                <textarea className="field min-h-28 py-3" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal notes, delivery instructions, or special terms" />
              </label>
            </section>
          ) : null}

          {step === 5 ? (
            <section className="space-y-4">
              <SelectedCustomerCard customer={selectedCustomer} compact />
              <div className="rounded-xl border border-blue-border bg-white p-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink3">Channel</p>
                <p className="mt-1 text-sm font-bold text-ink">{selectedChannel?.label ?? channel}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-blue-border bg-white">
                {items.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between gap-3 border-b border-blue-border px-4 py-3 last:border-b-0">
                    <div>
                      <p className="text-sm font-bold text-ink">{item.product_name}</p>
                      <p className="font-mono text-xs text-ink3">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                    </div>
                    <p className="font-mono text-sm font-bold text-ink">{formatCurrency(item.quantity * item.unit_price)}</p>
                  </div>
                ))}
              </div>
              <Totals
                subtotal={subtotal}
                discount={discount}
                vatAmount={vatAmount}
                deliveryFee={deliveryFee}
                total={total}
                readOnly
              />
            </section>
          ) : null}

          {step === "success" ? (
            <section className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-green-light text-green">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-display text-3xl font-bold text-ink">Order Created</h3>
                <p className="mt-2 font-mono text-sm font-bold text-blue-primary">{createdOrderNumber}</p>
              </div>
              <p className="max-w-sm text-sm text-ink2">
                The order has been saved to the pipeline and stock has been adjusted.
              </p>
              <button type="button" onClick={resetAndClose} className="primary-action w-full max-w-xs">
                Done
              </button>
            </section>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        {step !== "success" ? (
          <div className="flex flex-col gap-2 border-t border-blue-border bg-blue-pale px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {typeof step === "number" && step > 1 ? (
              <button type="button" onClick={back} className="secondary-action">
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <button type="button" onClick={resetAndClose} className="secondary-action">
                Cancel
              </button>
            )}

            {step === 5 ? (
              <button type="button" onClick={submitOrder} disabled={isSubmitting} className="primary-action">
                {isSubmitting ? "Creating..." : "Create Order"}
              </button>
            ) : (
              <button type="button" onClick={advance} disabled={!canAdvance()} className="primary-action disabled:opacity-50">
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SelectedCustomerCard({
  customer,
  onChange,
  compact,
}: {
  customer: Customer | null;
  onChange?: () => void;
  compact?: boolean;
}) {
  if (!customer) return null;
  return (
    <div className="rounded-xl border border-blue-border bg-blue-pale p-4">
      <div className="flex items-center gap-4">
        <HealthDot score={customer.health_score ?? 50} />
        <div className="min-w-0 flex-1">
          <p className={cn("font-bold text-ink", compact ? "text-sm" : "text-base")}>
            {customer.full_name}
          </p>
          <p className="mt-0.5 text-xs text-ink3">
            {[customer.customer_type, customer.city, customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}
          </p>
        </div>
        {onChange ? (
          <button type="button" onClick={onChange} className="text-xs font-bold text-blue-primary">
            Change
          </button>
        ) : null}
      </div>
    </div>
  );
}

function HealthDot({ score }: { score: number }) {
  const color = score >= 70 ? "border-green text-green" : score >= 40 ? "border-orange-300 text-orange-700" : "border-red-300 text-red-700";
  return (
    <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full border-4 bg-white font-mono text-[11px] font-bold", color)}>
      {score}
    </div>
  );
}

function Totals({
  subtotal,
  discount,
  vatAmount,
  deliveryFee,
  total,
  onDiscount,
  onVatAmount,
  onDeliveryFee,
  readOnly,
}: {
  subtotal: number;
  discount: number;
  vatAmount: number;
  deliveryFee: number;
  total: number;
  onDiscount?: (value: number) => void;
  onVatAmount?: (value: number) => void;
  onDeliveryFee?: (value: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-xl border border-blue-border bg-white p-4">
      <div className="flex justify-between text-sm text-ink2">
        <span>Subtotal</span>
        <span className="font-mono">{formatCurrency(subtotal)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-ink2">
        <span>Discount</span>
        {readOnly ? (
          <span className="font-mono">{formatCurrency(discount)}</span>
        ) : (
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(event) => onDiscount?.(Number(event.target.value))}
            className="h-10 w-32 rounded-lg border border-blue-border bg-blue-pale px-3 text-right font-mono text-sm outline-none focus:border-blue-primary"
          />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-ink2">
        <span>VAT</span>
        {readOnly ? (
          <span className="font-mono">{formatCurrency(vatAmount)}</span>
        ) : (
          <input
            type="number"
            min={0}
            value={vatAmount}
            onChange={(event) => onVatAmount?.(Number(event.target.value))}
            className="h-10 w-32 rounded-lg border border-blue-border bg-blue-pale px-3 text-right font-mono text-sm outline-none focus:border-blue-primary"
          />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-ink2">
        <span>Delivery fee</span>
        {readOnly ? (
          <span className="font-mono">{formatCurrency(deliveryFee)}</span>
        ) : (
          <input
            type="number"
            min={0}
            value={deliveryFee}
            onChange={(event) => onDeliveryFee?.(Number(event.target.value))}
            className="h-10 w-32 rounded-lg border border-blue-border bg-blue-pale px-3 text-right font-mono text-sm outline-none focus:border-blue-primary"
          />
        )}
      </div>
      <div className="mt-4 flex justify-between font-display text-2xl font-bold text-ink">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
