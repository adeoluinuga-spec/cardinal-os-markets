"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Product = { id: string; name: string; sku: string | null; stock_quantity: number | null };
type Receipt = { id: string; product_name: string; quantity: number; supplier_name: string | null; received_at: string };

export default function IncomingStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [supplier, setSupplier] = useState("");

  async function load() {
    const [productsResponse, stockResponse] = await Promise.all([
      fetch("/api/products/list", { cache: "no-store" }),
      fetch("/api/incoming-stock", { cache: "no-store" }),
    ]);
    if (productsResponse.ok) {
      const data = await productsResponse.json();
      setProducts(data.products ?? []);
    }
    if (stockResponse.ok) {
      const data = await stockResponse.json();
      setReceipts(data.entries ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function receive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/incoming-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity: Number(quantity), supplier_name: supplier }),
    });
    if (response.ok) {
      setQuantity("");
      setSupplier("");
      void load();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Incoming Stock" subtitle="Record goods received and update product stock in one action." />
      <Card>
        <form onSubmit={receive} className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]">
          <select required value={productId} onChange={(event) => setProductId(event.target.value)} className="h-10 rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light">
            <option value="">Select product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.stock_quantity ?? 0} in stock)</option>)}
          </select>
          <Input required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Qty" />
          <Input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Supplier" />
          <Button type="submit"><PackagePlus className="h-4 w-4" /> Receive</Button>
        </form>
      </Card>
      <div className="space-y-3">
        {receipts.map((receipt) => (
          <Card key={receipt.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-ink">{receipt.product_name}</p>
              <p className="text-sm text-ink2">{receipt.supplier_name ?? "No supplier"} - {new Date(receipt.received_at).toLocaleString()}</p>
            </div>
            <Badge variant="green">+{receipt.quantity} units</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
