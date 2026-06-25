"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase";

const BUSINESS_TYPES = [
  { label: "Electronics", value: "electronics" },
  { label: "Fashion & Apparel", value: "fashion" },
  { label: "Jewelry & Luxury", value: "jewelry" },
  { label: "Beauty & Cosmetics", value: "beauty" },
  { label: "Retail & General Trade", value: "general_trade" },
  { label: "Food & Grocery", value: "food" },
  { label: "Building Materials", value: "building_materials" },
  { label: "Auto Parts", value: "auto_parts" },
  { label: "Other", value: "other" },
];

type Form = {
  name: string;
  business_type: string;
  phone: string;
  address: string;
  city: string;
  ai_persona_name: string;
  logo_url: string;
};

const EMPTY: Form = {
  name: "",
  business_type: "",
  phone: "",
  address: "",
  city: "",
  ai_persona_name: "Cardinal",
  logo_url: "",
};

export function BusinessTab({ onToast }: { onToast: (m: string) => void }) {
  const { tenant, refetchTenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/business")
      .then((r) => r.json())
      .then((data) => {
        if (data.business) {
          const b = data.business;
          setForm({
            name: b.name ?? "",
            business_type: b.business_type ?? "",
            phone: b.phone ?? "",
            address: b.address ?? "",
            city: b.city ?? "",
            ai_persona_name: b.ai_persona_name ?? "Cardinal",
            logo_url: b.logo_url ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !tenant) return;
    setUploading(true);
    setError("");
    const extension = file.name.split(".").pop() || "png";
    const path = `tenants/${tenant.id}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("tenant-assets")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    // Cache-bust so the new logo shows immediately.
    setForm((f) => ({ ...f, logo_url: `${data.publicUrl}?v=${Date.now()}` }));
    setUploading(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Business name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/settings/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      onToast("Business profile saved");
      await refetchTenant();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save changes.");
    }
  }

  if (loading) {
    return (
      <Card className="flex justify-center py-10">
        <Spinner className="h-6 w-6" />
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-blue-border bg-blue-pale text-blue-primary hover:border-blue-primary"
            aria-label="Upload logo"
          >
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logo_url}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : uploading ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <UploadCloud className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
          <div>
            <p className="text-sm font-semibold text-ink">Business logo</p>
            <p className="text-xs text-ink2">PNG, JPG or WEBP. Click the box to upload.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogo}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-semibold text-ink2">Business name</span>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-ink2">Business type</span>
            <Select
              value={form.business_type}
              onChange={(e) => setForm({ ...form, business_type: e.target.value })}
            >
              <option value="">Select type</option>
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-ink2">Phone</span>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="tel"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-ink2">City</span>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-ink2">Address</span>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-ink2">
              AI persona name
            </span>
            <Input
              value={form.ai_persona_name}
              onChange={(e) => setForm({ ...form, ai_persona_name: e.target.value })}
              placeholder="Cardinal"
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || uploading}>
            {saving ? <Spinner className="h-4 w-4" /> : null}
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
