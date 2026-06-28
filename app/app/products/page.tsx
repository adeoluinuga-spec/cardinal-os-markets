"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Download, ImagePlus, PackageOpen, Plus, Search, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  unit_price: number | null;
  wholesale_price: number | null;
  cost_price: number | null;
  stock_quantity: number | null;
  reorder_point: number | null;
  unit: string | null;
  image_urls?: string[] | null;
};

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  description: string;
  unit_price: string;
  wholesale_price: string;
  cost_price: string;
  stock_quantity: string;
  reorder_point: string;
  unit: string;
  image_urls: string[];
};

type ImportRow = Record<string, string>;

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  category: "",
  description: "",
  unit_price: "",
  wholesale_price: "",
  cost_price: "",
  stock_quantity: "0",
  reorder_point: "5",
  unit: "unit",
  image_urls: [],
};

const csvHeaders = [
  "name",
  "sku",
  "category",
  "unit_price",
  "wholesale_price",
  "cost_price",
  "stock_quantity",
  "reorder_point",
  "unit",
];

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function stockState(product: Product) {
  const stock = Number(product.stock_quantity ?? 0);
  const reorder = Number(product.reorder_point ?? 0);

  if (stock === 0) {
    return {
      label: "Out of Stock",
      className: "bg-red-50 text-red-700 border-red-200",
      dot: "bg-red-600",
    };
  }

  if (stock <= reorder) {
    return {
      label: "Low Stock",
      className: "bg-orange-50 text-orange-700 border-orange-200",
      dot: "bg-orange-500",
    };
  }

  return {
    label: "In Stock",
    className: "bg-green-light text-green border-green-light",
    dot: "bg-green",
  };
}

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((item) => item.trim());
    return headers.reduce<ImportRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);
  const [adjusting, setAdjusting] = useState<{
    product: Product;
    direction: "add" | "remove";
  } | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importResult, setImportResult] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const outOfStock = products.filter(
      (product) => Number(product.stock_quantity ?? 0) === 0,
    ).length;
    const lowStock = products.filter((product) => {
      const stock = Number(product.stock_quantity ?? 0);
      return stock > 0 && stock <= Number(product.reorder_point ?? 0);
    }).length;
    const totalStockValue = products.reduce(
      (total, product) =>
        total +
        Number(product.stock_quantity ?? 0) * Number(product.cost_price ?? 0),
      0,
    );

    return { totalProducts, outOfStock, lowStock, totalStockValue };
  }, [products]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(
      `/api/products/list?search=${encodeURIComponent(search)}`,
      { cache: "no-store" },
    );

    if (response.ok) {
      const data = (await response.json()) as { products: Product[] };
      setProducts(data.products);
    }

    setIsLoading(false);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchProducts();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchProducts]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const response = await fetch("/api/products/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        unit_price: Number(form.unit_price),
        wholesale_price: Number(form.wholesale_price || 0),
        cost_price: Number(form.cost_price || 0),
        stock_quantity: Number(form.stock_quantity || 0),
        reorder_point: Number(form.reorder_point || 5),
      }),
    });
    setIsSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to create product.");
      return;
    }

    setForm(emptyForm);
    setIsAddOpen(false);
    await fetchProducts();
  }

  function openEditProduct(product: Product) {
    setError("");
    setEditingProduct(product);
    setEditForm({
      name: product.name ?? "",
      sku: product.sku ?? "",
      category: product.category ?? "",
      description: product.description ?? "",
      unit_price: product.unit_price == null ? "" : String(product.unit_price),
      wholesale_price:
        product.wholesale_price == null ? "" : String(product.wholesale_price),
      cost_price: product.cost_price == null ? "" : String(product.cost_price),
      stock_quantity:
        product.stock_quantity == null ? "0" : String(product.stock_quantity),
      reorder_point:
        product.reorder_point == null ? "5" : String(product.reorder_point),
      unit: product.unit ?? "unit",
      image_urls: product.image_urls ?? [],
    });
  }

  async function updateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct) {
      return;
    }

    setError("");
    setIsSaving(true);
    const response = await fetch(`/api/products/${editingProduct.id}/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name.trim(),
        sku: editForm.sku.trim() || null,
        category: editForm.category.trim() || null,
        description: editForm.description.trim() || null,
        unit_price: Number(editForm.unit_price || 0),
        wholesale_price: Number(editForm.wholesale_price || 0),
        cost_price: Number(editForm.cost_price || 0),
        stock_quantity: Number(editForm.stock_quantity || 0),
        reorder_point: Number(editForm.reorder_point || 5),
        unit: editForm.unit.trim() || "unit",
        image_urls: editForm.image_urls.slice(0, 3),
      }),
    });
    setIsSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to update product.");
      return;
    }

    setEditingProduct(null);
    setEditForm(emptyForm);
    await fetchProducts();
  }

  function downloadTemplate() {
    const blob = new Blob([`${csvHeaders.join(",")}\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cardinal-products-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvUpload(file: File) {
    const text = await file.text();
    setImportRows(parseCsv(text));
    setImportResult("");
  }

  async function confirmImport() {
    setError("");
    const response = await fetch("/api/products/import-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: importRows }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to import CSV.");
      return;
    }

    const data = (await response.json()) as { imported: number; skipped: number };
    setImportResult(
      `${data.imported} products imported, ${data.skipped} skipped (duplicate SKU)`,
    );
    await fetchProducts();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Manage catalog, prices, and stock.">
        <Button variant="ghost" onClick={() => setIsImportOpen(true)}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Import CSV
        </Button>
        <Button
          onClick={() => {
            setError("");
            setForm(emptyForm);
            setIsAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Product
        </Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Products" value={stats.totalProducts} />
        <StatCard label="Out of Stock" value={stats.outOfStock} />
        <StatCard label="Low Stock" value={stats.lowStock} />
        <StatCard
          label="Total Stock Value"
          value={formatCurrency(stats.totalStockValue)}
        />
      </section>

      <Card className="p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products by name or SKU"
            className="pl-9"
          />
        </div>
      </Card>

      {isLoading ? (
        <Card className="flex min-h-80 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </Card>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-6 w-6" aria-hidden="true" />}
          title="No products yet."
          description="Add your first product or import from CSV."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEditProduct(product)}
              onAdjust={(direction) => setAdjusting({ product, direction })}
            />
          ))}
        </section>
      )}

      {isAddOpen ? (
        <ProductModal
          form={form}
          setForm={setForm}
          isSaving={isSaving}
          error={error}
          title="Add Product"
          submitLabel="Save Product"
          onClose={() => setIsAddOpen(false)}
          onSubmit={createProduct}
        />
      ) : null}

      {editingProduct ? (
        <ProductModal
          form={editForm}
          setForm={setEditForm}
          isSaving={isSaving}
          error={error}
          title="Edit Product"
          submitLabel="Save Changes"
          onClose={() => {
            setEditingProduct(null);
            setEditForm(emptyForm);
            setError("");
          }}
          onSubmit={updateProduct}
        />
      ) : null}

      {isImportOpen ? (
        <ImportModal
          rows={importRows}
          result={importResult}
          error={error}
          onClose={() => setIsImportOpen(false)}
          onDownload={downloadTemplate}
          onUpload={handleCsvUpload}
          onConfirm={confirmImport}
        />
      ) : null}

      {adjusting ? (
        <AdjustStockModal
          product={adjusting.product}
          direction={adjusting.direction}
          onClose={() => setAdjusting(null)}
          onSaved={async () => {
            setAdjusting(null);
            await fetchProducts();
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-t-4 border-t-blue-primary p-4">
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm font-semibold text-ink2">{label}</p>
    </Card>
  );
}

function ProductCard({
  product,
  onEdit,
  onAdjust,
}: {
  product: Product;
  onEdit: () => void;
  onAdjust: (direction: "add" | "remove") => void;
}) {
  const state = stockState(product);
  const images = product.image_urls ?? [];

  return (
    <Card className="p-5">
      <div className="mb-4 overflow-hidden rounded-xl border border-blue-border bg-blue-pale">
        {images[0] ? (
          <img
            src={images[0]}
            alt={product.name}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-blue-primary">
            <PackageOpen className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{product.name}</h2>
          <p className="mt-1 font-mono text-xs text-ink3">
            {product.sku || "No SKU"}
          </p>
        </div>
        {product.category ? <Badge variant="blue">{product.category}</Badge> : null}
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {images.slice(0, 3).map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-12 w-12 rounded-lg border border-blue-border object-cover"
            />
          ))}
        </div>
      ) : null}
      <div
        className={cn(
          "mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold",
          state.className,
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", state.dot)} />
        {state.label}
      </div>
      <div className="mt-5">
        <p className="font-display text-3xl font-bold text-ink">
          {formatCurrency(product.unit_price)}
        </p>
        <p className="mt-1 text-sm text-ink2">
          Wholesale {formatCurrency(product.wholesale_price)}
        </p>
      </div>
      <p className="mt-4 text-sm font-semibold text-ink2">
        {product.stock_quantity ?? 0} {product.unit ?? "units"}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" onClick={() => onAdjust("add")}>
          +Stock
        </Button>
        <Button variant="ghost" onClick={() => onAdjust("remove")}>
          -Stock
        </Button>
      </div>
    </Card>
  );
}

function ProductModal({
  form,
  setForm,
  isSaving,
  error,
  title,
  submitLabel,
  onClose,
  onSubmit,
}: {
  form: ProductForm;
  setForm: (form: ProductForm) => void;
  isSaving: boolean;
  error: string;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageError, setImageError] = useState("");

  async function uploadImages(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setImageError("");
    const remainingSlots = Math.max(0, 3 - form.image_urls.length);
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    if (!selectedFiles.length) {
      setImageError("You can add up to 3 product images.");
      return;
    }

    const payload = new FormData();
    selectedFiles.forEach((file) => payload.append("images", file));

    setIsUploadingImages(true);
    const response = await fetch("/api/products/upload-image", {
      method: "POST",
      body: payload,
    });
    setIsUploadingImages(false);

    const data = (await response.json()) as { urls?: string[]; error?: string };
    if (!response.ok) {
      setImageError(data.error ?? "Unable to upload product images.");
      return;
    }

    setForm({
      ...form,
      image_urls: [...form.image_urls, ...(data.urls ?? [])].slice(0, 3),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/45 p-4 backdrop-blur-sm">
      <Card className="max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5">
        <ModalHeader title={title} onClose={onClose} />
        <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Product Name" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </Field>
          <Field label="SKU">
            <Input
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
              placeholder="Auto-generated if blank"
            />
          </Field>
          <Field label="Category">
            <Input
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className="min-h-24 w-full rounded-lg border border-blue-border bg-blue-pale px-3 py-2 text-sm text-ink outline-none focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light"
            />
          </Field>
          <div className="sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink2">
              Product Images
            </span>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-border bg-blue-pale px-4 py-5 text-center transition hover:border-blue-primary hover:bg-blue-light">
                <ImagePlus className="h-6 w-6 text-blue-primary" aria-hidden="true" />
                <span className="mt-2 text-sm font-semibold text-ink">
                  Upload up to 3 images
                </span>
                <span className="mt-1 text-xs text-ink3">
                  JPG, PNG, WEBP, or GIF
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  disabled={form.image_urls.length >= 3 || isUploadingImages}
                  onChange={(event) => void uploadImages(event.target.files)}
                />
              </label>
              <div className="grid grid-cols-3 gap-2 sm:w-48">
                {[0, 1, 2].map((slot) => {
                  const url = form.image_urls[slot];
                  return (
                    <div
                      key={slot}
                      className="relative aspect-square overflow-hidden rounded-xl border border-blue-border bg-white"
                    >
                      {url ? (
                        <>
                          <img
                            src={url}
                            alt={`Product image ${slot + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                image_urls: form.image_urls.filter(
                                  (item) => item !== url,
                                ),
                              })
                            }
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-blue-dark/80 text-white"
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-semibold text-ink3">
                          {slot + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {isUploadingImages ? (
              <p className="mt-2 text-xs font-semibold text-blue-primary">
                Uploading images...
              </p>
            ) : null}
            {imageError ? (
              <p className="mt-2 text-xs font-semibold text-red-700">{imageError}</p>
            ) : null}
          </div>
          <Field label="Retail Price">
            <Input
              type="number"
              min={0}
              value={form.unit_price}
              onChange={(event) =>
                setForm({ ...form, unit_price: event.target.value })
              }
              required
            />
          </Field>
          <Field label="Wholesale Price">
            <Input
              type="number"
              min={0}
              value={form.wholesale_price}
              onChange={(event) =>
                setForm({ ...form, wholesale_price: event.target.value })
              }
            />
          </Field>
          <Field label="Cost Price">
            <Input
              type="number"
              min={0}
              value={form.cost_price}
              onChange={(event) =>
                setForm({ ...form, cost_price: event.target.value })
              }
            />
          </Field>
          <Field label="Stock Quantity">
            <Input
              type="number"
              min={0}
              value={form.stock_quantity}
              onChange={(event) =>
                setForm({ ...form, stock_quantity: event.target.value })
              }
              required
            />
          </Field>
          <Field label="Reorder Point">
            <Input
              type="number"
              min={0}
              value={form.reorder_point}
              onChange={(event) =>
                setForm({ ...form, reorder_point: event.target.value })
              }
            />
          </Field>
          <Field label="Unit">
            <Input
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
            />
          </Field>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 sm:col-span-2">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function ImportModal({
  rows,
  result,
  error,
  onClose,
  onDownload,
  onUpload,
  onConfirm,
}: {
  rows: ImportRow[];
  result: string;
  error: string;
  onClose: () => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/45 p-4 backdrop-blur-sm">
      <Card className="max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5">
        <ModalHeader title="Import CSV" onClose={onClose} />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={onDownload}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download template
          </Button>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-primary px-4 text-sm font-semibold text-white">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void onUpload(file);
                }
              }}
            />
          </label>
        </div>
        {rows.length ? (
          <>
            <div className="mt-5 overflow-x-auto rounded-xl border border-blue-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-blue-pale text-xs uppercase text-ink3">
                  <tr>
                    {csvHeaders.map((header) => (
                      <th key={header} className="px-3 py-2">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-t border-blue-border">
                      {csvHeaders.map((header) => (
                        <td key={header} className="px-3 py-2">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="mt-5" onClick={onConfirm}>
              Import {rows.length} products
            </Button>
          </>
        ) : null}
        {result ? (
          <p className="mt-4 rounded-lg bg-green-light px-3 py-2 text-sm font-semibold text-green">
            {result}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function AdjustStockModal({
  product,
  direction,
  onClose,
  onSaved,
}: {
  product: Product;
  direction: "add" | "remove";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("restock");
  const [error, setError] = useState("");

  async function save() {
    setError("");
    const response = await fetch(`/api/products/${product.id}/adjust-stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: Number(quantity), reason, direction }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to adjust stock.");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-dark/45 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm p-5">
        <ModalHeader title="Adjust stock" onClose={onClose} />
        <p className="mt-2 text-sm font-semibold text-ink">{product.name}</p>
        <div className="mt-5 space-y-4">
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <Select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="restock">Restock</option>
            <option value="correction">Correction</option>
            <option value="damage">Damage</option>
            <option value="sale">Sale</option>
          </Select>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <Button className="w-full" onClick={save}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-blue-pale"
        aria-label="Close"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold text-ink2">{label}</span>
      {children}
    </label>
  );
}
