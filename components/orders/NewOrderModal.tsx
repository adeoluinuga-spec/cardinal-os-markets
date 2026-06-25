"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Globe,
  Camera,
  MessageCircle,
  Monitor,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit_price: number | null;
  stock_quantity: number | null;
};

type OrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

const channels = [
  { label: "WhatsApp", value: "whatsapp", icon: MessageCircle },
  { label: "Walk-in", value: "walk_in", icon: Store },
  { label: "Phone", value: "phone", icon: Phone },
  { label: "Instagram", value: "instagram", icon: Camera },
  { label: "Website", value: "website", icon: Globe },
  { label: "Manual", value: "manual", icon: Monitor },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
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
  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "" });
  const [channel, setChannel] = useState("manual");
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + Number(item.quantity) * Number(item.unit_price),
        0,
      ),
    [items],
  );
  const total = Math.max(0, subtotal - Number(discount || 0));

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const response = await fetch(
        `/api/customers/list?search=${encodeURIComponent(customerSearch)}`,
        { cache: "no-store" },
      );

      if (response.ok) {
        const data = (await response.json()) as { customers: Customer[] };
        setCustomers(data.customers.slice(0, 6));
      }
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [customerSearch, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const response = await fetch(
        `/api/products/search?search=${encodeURIComponent(productSearch)}`,
        { cache: "no-store" },
      );

      if (response.ok) {
        const data = (await response.json()) as { products: Product[] };
        setProducts(data.products);
      }
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [open, productSearch]);

  if (!open) {
    return null;
  }

  function resetAndClose() {
    setStep(1);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setItems([]);
    setDiscount(0);
    setDeliveryAddress("");
    setExpectedDeliveryAt("");
    setNotes("");
    setError("");
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
        customer_type: "retail",
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to create customer.");
      return;
    }

    const data = (await response.json()) as { customer: Customer };
    setSelectedCustomer(data.customer);
    setCustomerSearch(data.customer.full_name);
    setShowNewCustomer(false);
  }

  function addProduct(product: Product) {
    if (items.some((item) => item.product_id === product.id)) {
      return;
    }

    setItems((current) => [
      ...current,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: Number(product.unit_price ?? 0),
      },
    ]);
    setProductSearch("");
  }

  async function submitOrder() {
    setError("");

    if (!selectedCustomer) {
      setStep(1);
      setError("Select or create a customer first.");
      return;
    }

    if (items.length === 0) {
      setStep(3);
      setError("Add at least one product.");
      return;
    }

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
        delivery_address: deliveryAddress,
        expected_delivery_at: expectedDeliveryAt,
        notes,
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to create order.");
      return;
    }

    onCreated();
    resetAndClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-blue-dark/50 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl md:h-auto md:max-h-[92vh] md:rounded-xl">
        <div className="flex items-center justify-between border-b border-blue-border px-5 py-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-blue-primary">
              Step {step} of 4
            </p>
            <h2 className="font-display text-2xl font-bold text-ink">
              New Order
            </h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-blue-pale"
            aria-label="Close new order modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            <section>
              <h3 className="font-display text-xl font-bold text-ink">
                Customer
              </h3>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-ink3" />
                <Input
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Search customer by name or phone"
                  className="pl-9"
                />
                <div className="mt-2 overflow-hidden rounded-xl border border-blue-border bg-white">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch(customer.full_name);
                      }}
                      className={cn(
                        "block w-full px-4 py-3 text-left text-sm hover:bg-blue-pale",
                        selectedCustomer?.id === customer.id && "bg-blue-light",
                      )}
                    >
                      <span className="font-semibold text-ink">
                        {customer.full_name}
                      </span>
                      <span className="ml-2 text-ink3">
                        {customer.phone ?? ""}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowNewCustomer(true)}
                    className="flex w-full items-center gap-2 border-t border-blue-border px-4 py-3 text-left text-sm font-semibold text-blue-primary hover:bg-blue-pale"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Customer
                  </button>
                </div>
              </div>

              {showNewCustomer ? (
                <form
                  onSubmit={createInlineCustomer}
                  className="mt-4 grid gap-3 rounded-xl border border-blue-border bg-blue-pale p-4 sm:grid-cols-[1fr_160px_auto]"
                >
                  <Input
                    value={newCustomer.full_name}
                    onChange={(event) =>
                      setNewCustomer({
                        ...newCustomer,
                        full_name: event.target.value,
                      })
                    }
                    placeholder="Customer name"
                    required
                  />
                  <Input
                    value={newCustomer.phone}
                    onChange={(event) =>
                      setNewCustomer({ ...newCustomer, phone: event.target.value })
                    }
                    placeholder="Phone"
                  />
                  <Button type="submit">Create</Button>
                </form>
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h3 className="font-display text-xl font-bold text-ink">
                Channel
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {channels.map((item) => {
                  const Icon = item.icon;
                  const selected = channel === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setChannel(item.value)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-blue-border p-4 text-left font-semibold transition",
                        selected
                          ? "border-blue-primary bg-blue-primary text-white"
                          : "bg-blue-pale text-ink hover:bg-blue-light",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <h3 className="font-display text-xl font-bold text-ink">
                Order Items
              </h3>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-ink3" />
                <Input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search products by name or SKU"
                  className="pl-9"
                />
                {productSearch ? (
                  <div className="absolute z-10 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-blue-border bg-white shadow-lg">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="block w-full px-4 py-3 text-left text-sm hover:bg-blue-pale"
                      >
                        <span className="font-semibold text-ink">
                          {product.name}
                        </span>
                        <span className="ml-2 text-ink3">
                          {product.sku ?? ""} · Stock {product.stock_quantity ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className="grid gap-3 rounded-xl border border-blue-border bg-blue-pale p-3 md:grid-cols-[1fr_90px_120px_120px_40px]"
                  >
                    <p className="self-center text-sm font-semibold text-ink">
                      {item.product_name}
                    </p>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((row) =>
                            row.product_id === item.product_id
                              ? { ...row, quantity: Number(event.target.value) }
                              : row,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      value={item.unit_price}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((row) =>
                            row.product_id === item.product_id
                              ? { ...row, unit_price: Number(event.target.value) }
                              : row,
                          ),
                        )
                      }
                    />
                    <p className="self-center font-semibold text-ink">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (row) => row.product_id !== item.product_id,
                          ),
                        )
                      }
                      className="flex h-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-blue-border bg-white p-4">
                <div className="flex justify-between text-sm text-ink2">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-ink2">
                  <span>Discount</span>
                  <Input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(event) => setDiscount(Number(event.target.value))}
                    className="w-32"
                  />
                </div>
                <div className="mt-3 flex justify-between font-display text-2xl font-bold text-ink">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section>
              <h3 className="font-display text-xl font-bold text-ink">
                Details
              </h3>
              <div className="mt-4 grid gap-4">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Delivery address
                  </span>
                  <Input
                    value={deliveryAddress}
                    onChange={(event) => setDeliveryAddress(event.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Expected delivery date
                  </span>
                  <Input
                    type="date"
                    value={expectedDeliveryAt}
                    onChange={(event) => setExpectedDeliveryAt(event.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Notes
                  </span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-28 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none transition focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
                  />
                </label>
              </div>
            </section>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-blue-border px-5 py-4">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? resetAndClose() : setStep(step - 1))}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step === 4 ? (
            <Button onClick={submitOrder} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Order"}
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)}>Continue</Button>
          )}
        </div>
      </div>
    </div>
  );
}
