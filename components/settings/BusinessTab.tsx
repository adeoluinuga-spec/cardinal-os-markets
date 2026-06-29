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
  paystack_public_key: string;
  whatsapp_number: string;
  daily_brief_enabled: boolean;
  daily_brief_time: string;
  daily_brief_frequency: string;
  weekly_brief_day: string;
  whatsapp_opted_in: boolean;
};

const EMPTY: Form = {
  name: "",
  business_type: "",
  phone: "",
  address: "",
  city: "",
  ai_persona_name: "Cardinal",
  logo_url: "",
  paystack_public_key: "",
  whatsapp_number: "",
  daily_brief_enabled: true,
  daily_brief_time: "18:00",
  daily_brief_frequency: "daily",
  weekly_brief_day: "1",
  whatsapp_opted_in: false,
};

const WEEK_DAYS = [
  { label: "Sunday", value: "0" },
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
];

export function BusinessTab({ onToast }: { onToast: (m: string) => void }) {
  const { tenant, refetchTenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [paystackSecretKey, setPaystackSecretKey] = useState("");
  const [paystackWebhookSecret, setPaystackWebhookSecret] = useState("");
  const [hasPaystackSecret, setHasPaystackSecret] = useState(false);
  const [hasPaystackWebhookSecret, setHasPaystackWebhookSecret] = useState(false);
  const [sendingTestBrief, setSendingTestBrief] = useState(false);

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
            paystack_public_key: b.paystack_public_key ?? "",
            whatsapp_number: b.whatsapp_number ?? "",
            daily_brief_enabled: b.daily_brief_enabled ?? true,
            daily_brief_time: b.daily_brief_time ?? "18:00",
            daily_brief_frequency: b.daily_brief_frequency ?? "daily",
            weekly_brief_day: String(b.weekly_brief_day ?? 1),
            whatsapp_opted_in: b.whatsapp_opted_in ?? false,
          });
          setHasPaystackSecret(Boolean(b.has_paystack_secret_key));
          setHasPaystackWebhookSecret(Boolean(b.has_paystack_webhook_secret));
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
    const payload: Record<string, unknown> = { ...form };
    if (paystackSecretKey.trim()) {
      payload.paystack_secret_key = paystackSecretKey.trim();
    }
    if (paystackWebhookSecret.trim()) {
      payload.paystack_webhook_secret = paystackWebhookSecret.trim();
    }

    const res = await fetch("/api/settings/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      onToast("Business profile saved");
      if (paystackSecretKey.trim()) setHasPaystackSecret(true);
      if (paystackWebhookSecret.trim()) setHasPaystackWebhookSecret(true);
      setPaystackSecretKey("");
      setPaystackWebhookSecret("");
      await refetchTenant();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save changes.");
    }
  }

  async function sendTestBrief() {
    setSendingTestBrief(true);
    setError("");
    const res = await fetch("/api/settings/brief/test", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setSendingTestBrief(false);
    if (res.ok) {
      onToast("Test WhatsApp brief sent");
    } else {
      setError(data.error ?? "Could not send test brief.");
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

        <div className="rounded-xl border border-blue-border bg-blue-pale p-4">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">
              Customer Paystack
            </h3>
            <p className="mt-1 text-sm text-ink2">
              Used only when your customers pay you for orders. Subscription billing still uses Stuart Davidson&apos;s Paystack account.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-ink2">
                Tenant Paystack public key
              </span>
              <Input
                value={form.paystack_public_key}
                onChange={(e) =>
                  setForm({ ...form, paystack_public_key: e.target.value })
                }
                placeholder="pk_live_..."
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-ink2">
                Tenant Paystack secret key
              </span>
              <Input
                type="password"
                value={paystackSecretKey}
                onChange={(e) => setPaystackSecretKey(e.target.value)}
                placeholder={hasPaystackSecret ? "Saved - enter to replace" : "sk_live_..."}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-ink2">
                Tenant webhook secret
              </span>
              <Input
                type="password"
                value={paystackWebhookSecret}
                onChange={(e) => setPaystackWebhookSecret(e.target.value)}
                placeholder={
                  hasPaystackWebhookSecret
                    ? "Saved - enter to replace"
                    : "Paystack webhook secret"
                }
              />
            </label>
          </div>
          <p className="mt-3 font-mono text-[11px] text-ink3">
            Tenant webhook URL: /api/webhooks/paystack/{tenant?.slug ?? "[tenant_slug]"}
          </p>
        </div>

        <div className="rounded-xl border border-blue-border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">
                Daily WhatsApp Brief
              </h3>
              <p className="mt-1 text-sm text-ink2">
                Send business performance updates to the owner on WhatsApp.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.daily_brief_enabled && form.whatsapp_opted_in}
                onChange={(e) =>
                  setForm({
                    ...form,
                    daily_brief_enabled: e.target.checked,
                    whatsapp_opted_in: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-blue-border text-blue-primary focus:ring-blue-primary"
              />
              Enabled
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-semibold text-ink2">
                WhatsApp number
              </span>
              <Input
                value={form.whatsapp_number}
                onChange={(e) =>
                  setForm({ ...form, whatsapp_number: e.target.value })
                }
                inputMode="tel"
                placeholder="08012345678"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-ink2">
                Send updates
              </span>
              <Select
                value={form.daily_brief_frequency}
                onChange={(e) =>
                  setForm({ ...form, daily_brief_frequency: e.target.value })
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </Select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-ink2">
                Preferred time
              </span>
              <Input
                type="time"
                value={form.daily_brief_time}
                onChange={(e) =>
                  setForm({ ...form, daily_brief_time: e.target.value })
                }
              />
            </label>
            {form.daily_brief_frequency === "weekly" ? (
              <label>
                <span className="mb-1 block text-sm font-semibold text-ink2">
                  Weekly day
                </span>
                <Select
                  value={form.weekly_brief_day}
                  onChange={(e) =>
                    setForm({ ...form, weekly_brief_day: e.target.value })
                  }
                >
                  {WEEK_DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={sendTestBrief}
              disabled={sendingTestBrief || !form.whatsapp_number}
            >
              {sendingTestBrief ? <Spinner className="h-4 w-4" /> : null}
              Send me a test brief now
            </Button>
          </div>
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
