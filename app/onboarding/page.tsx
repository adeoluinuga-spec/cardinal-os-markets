"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  PackagePlus,
  Plus,
  Trash2,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { supabase } from "@/lib/supabase";

type Tenant = {
  id: string;
  name: string;
  business_type: string | null;
  city: string | null;
  phone: string | null;
  market_association: string | null;
  logo_url: string | null;
};

type ProductDraft = {
  id: string;
  name: string;
  price: string;
  stock: string;
};

const businessTypes = [
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

const inviteRoles = [
  { label: "Sales Agent", value: "sales_agent" },
  { label: "Warehouse", value: "warehouse" },
  { label: "Finance", value: "finance" },
  { label: "Rider", value: "rider" },
];

function makeProductDraft(): ProductDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: "",
    stock: "",
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [city, setCity] = useState("Lagos");
  const [businessPhone, setBusinessPhone] = useState("");
  const [marketAssociation, setMarketAssociation] = useState("");
  const [isAssociationLocked, setIsAssociationLocked] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [products, setProducts] = useState<ProductDraft[]>([makeProductDraft()]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("sales_agent");
  const [inviteStatus, setInviteStatus] = useState("");

  const progressWidth = useMemo(() => `${(step / 4) * 100}%`, [step]);

  useEffect(() => {
    async function loadTenant() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: tenantUser, error: tenantError } = await supabase
        .from("tenant_users")
        .select("tenant:tenants(id,name,business_type,city,phone,market_association,logo_url)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      const loadedTenant = Array.isArray(tenantUser?.tenant)
        ? tenantUser?.tenant[0]
        : tenantUser?.tenant;

      if (tenantError || !loadedTenant) {
        router.replace("/signup");
        return;
      }

      const nextTenant = loadedTenant as Tenant;
      setTenant(nextTenant);
      setBusinessName(nextTenant.name ?? "");
      setBusinessType(nextTenant.business_type ?? "");
      setCity(nextTenant.city ?? "Lagos");
      setBusinessPhone(nextTenant.phone ?? "");
      setMarketAssociation(nextTenant.market_association ?? "");
      setLogoPreview(nextTenant.logo_url ?? "");

      const { data: associationMember } = await supabase
        .from("association_members")
        .select("association:associations(name, slug)")
        .eq("tenant_id", nextTenant.id)
        .maybeSingle();

      const association = Array.isArray(associationMember?.association)
        ? associationMember?.association[0]
        : associationMember?.association;

      if (association?.slug) {
        setMarketAssociation(association.name ?? association.slug);
        setIsAssociationLocked(true);
      }

      setIsLoading(false);
    }

    void loadTenant();
  }, [router]);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function saveBusinessDetails() {
    if (!tenant) {
      return false;
    }

    if (!businessName.trim() || !businessType || !city.trim()) {
      setError("Please complete business name, business type, and city.");
      return false;
    }

    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        name: businessName.trim(),
        business_type: businessType,
        city: city.trim(),
        phone: businessPhone.trim() || null,
        market_association: marketAssociation.trim() || null,
      })
      .eq("id", tenant.id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setTenant({
      ...tenant,
      name: businessName.trim(),
      business_type: businessType,
      city: city.trim(),
      phone: businessPhone.trim() || null,
      market_association: marketAssociation.trim() || null,
    });
    return true;
  }

  async function uploadLogoIfNeeded() {
    if (!tenant || !logoFile) {
      return true;
    }

    const extension = logoFile.name.split(".").pop() || "png";
    const path = `tenants/${tenant.id}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("tenant-assets")
      .upload(path, logoFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setError(uploadError.message);
      return false;
    }

    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ logo_url: data.publicUrl })
      .eq("id", tenant.id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setLogoPreview(data.publicUrl);
    setLogoFile(null);
    return true;
  }

  async function saveProducts() {
    if (!tenant) {
      return false;
    }

    const rows = products
      .map((product) => ({
        tenant_id: tenant.id,
        name: product.name.trim(),
        unit_price: Number(product.price || 0),
        stock_quantity: Number(product.stock || 0),
      }))
      .filter((product) => product.name);

    if (rows.length === 0) {
      return true;
    }

    const { error: insertError } = await supabase.from("products").insert(rows);

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    return true;
  }

  async function sendInvite() {
    if (!tenant || !inviteEmail.trim()) {
      return true;
    }

    const email = inviteEmail.trim();
    // The secure invite route derives the tenant and inviter from the
    // authenticated session, so we only send the invitee's details. It
    // requires a full_name; fall back to the email's local-part since
    // onboarding doesn't collect a separate name for the invitee.
    const fullName = email.split("@")[0] || email;

    const response = await fetch("/api/settings/team/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: fullName,
        email,
        role: inviteRole,
      }),
    });

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "Unable to send invite.");
      return false;
    }

    setInviteStatus("Invite sent.");
    return true;
  }

  async function finishSetup() {
    if (!tenant) {
      return;
    }

    const { error: updateError } = await supabase
      .from("tenants")
      .update({ onboarding_completed: true })
      .eq("id", tenant.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    sessionStorage.setItem(
      "cardinal-welcome-toast",
      `Welcome to Cardinal OS Markets, ${businessName.trim() || tenant.name}!`,
    );
    router.replace("/app/dashboard");
    router.refresh();
  }

  async function continueStep() {
    setError("");
    setIsSaving(true);

    const handlers: Record<number, () => Promise<boolean>> = {
      1: saveBusinessDetails,
      2: uploadLogoIfNeeded,
      3: saveProducts,
      4: sendInvite,
    };

    const ok = await handlers[step]();
    setIsSaving(false);

    if (!ok) {
      return;
    }

    if (step === 4) {
      await finishSetup();
      return;
    }

    setStep((currentStep) => currentStep + 1);
  }

  async function skipStep() {
    setError("");

    if (step === 4) {
      await finishSetup();
      return;
    }

    setStep((currentStep) => currentStep + 1);
  }

  function updateProduct(id: string, field: keyof ProductDraft, value: string) {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === id ? { ...product, [field]: value } : product,
      ),
    );
  }

  function removeProduct(id: string) {
    setProducts((currentProducts) =>
      currentProducts.length === 1
        ? [makeProductDraft()]
        : currentProducts.filter((product) => product.id !== id),
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-pale">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-pale px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-0 z-10 -mx-4 bg-blue-pale px-4 pb-4 pt-1 sm:-mx-6 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-blue-primary">
                Cardinal OS Markets
              </p>
              <p className="mt-1 text-sm font-semibold text-ink2">
                Step {step} of 4
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-primary font-bold text-white">
              C
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-light">
            <div
              className="h-full rounded-full bg-blue-primary transition-all"
              style={{ width: progressWidth }}
            />
          </div>
        </div>

        <Card className="mt-6 p-5 sm:p-7">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((currentStep) => currentStep - 1)}
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-primary hover:text-blue-dark"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
          ) : null}

          {step === 1 ? (
            <section>
              <h1 className="font-display text-3xl font-bold text-ink">
                Business details
              </h1>
              <div className="mt-6 grid gap-4">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Business name
                  </span>
                  <Input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Business type
                  </span>
                  <Select
                    value={businessType}
                    onChange={(event) => setBusinessType(event.target.value)}
                  >
                    <option value="">Select business type</option>
                    {businessTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    City
                  </span>
                  <Input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Business phone
                  </span>
                  <Input
                    value={businessPhone}
                    onChange={(event) => setBusinessPhone(event.target.value)}
                    inputMode="tel"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Market/Association
                  </span>
                  <Input
                    value={marketAssociation}
                    onChange={(event) =>
                      setMarketAssociation(event.target.value)
                    }
                    readOnly={isAssociationLocked}
                    placeholder="Optional"
                  />
                </label>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h1 className="font-display text-3xl font-bold text-ink">
                Upload your logo
              </h1>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 flex min-h-56 w-full flex-col items-center justify-center rounded-xl border border-dashed border-blue-border bg-blue-pale px-6 py-8 text-center transition hover:border-blue-primary hover:bg-blue-light"
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Business logo preview"
                    className="h-28 w-28 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-primary">
                    <UploadCloud className="h-7 w-7" aria-hidden="true" />
                  </div>
                )}
                <span className="mt-4 text-sm font-semibold text-ink">
                  Drag and drop area or click to upload
                </span>
                <span className="mt-1 text-xs text-ink3">PNG, JPG, or WEBP</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <h1 className="font-display text-3xl font-bold text-ink">
                Add your first products
              </h1>
              <div className="mt-6 space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="grid gap-3 rounded-xl border border-blue-border bg-blue-pale p-3 sm:grid-cols-[1fr_120px_110px_40px]"
                  >
                    <Input
                      value={product.name}
                      onChange={(event) =>
                        updateProduct(product.id, "name", event.target.value)
                      }
                      placeholder="Product name"
                    />
                    <Input
                      value={product.price}
                      onChange={(event) =>
                        updateProduct(product.id, "price", event.target.value)
                      }
                      inputMode="decimal"
                      placeholder="Price"
                    />
                    <Input
                      value={product.stock}
                      onChange={(event) =>
                        updateProduct(product.id, "stock", event.target.value)
                      }
                      inputMode="numeric"
                      placeholder="Stock Qty"
                    />
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="flex h-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                      aria-label="Remove product"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                className="mt-4"
                disabled={products.length >= 5}
                onClick={() =>
                  setProducts((currentProducts) => [
                    ...currentProducts,
                    makeProductDraft(),
                  ])
                }
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Product
              </Button>
            </section>
          ) : null}

          {step === 4 ? (
            <section>
              <h1 className="font-display text-3xl font-bold text-ink">
                Invite your first team member
              </h1>
              <div className="mt-6 grid gap-4">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Team member email
                  </span>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink2">
                    Role
                  </span>
                  <Select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                  >
                    {inviteRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                </label>
                {inviteStatus ? (
                  <p className="rounded-lg bg-green-light px-3 py-2 text-sm font-semibold text-green">
                    {inviteStatus}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step === 2 ? (
              <Button variant="ghost" onClick={skipStep}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                Skip for now
              </Button>
            ) : step === 3 ? (
              <Button variant="ghost" onClick={skipStep}>
                <PackagePlus className="h-4 w-4" aria-hidden="true" />
                Skip for now
              </Button>
            ) : step === 4 ? (
              <Button variant="ghost" onClick={skipStep}>
                Skip — I&apos;ll do this later
              </Button>
            ) : (
              <span />
            )}

            <Button onClick={continueStep} disabled={isSaving}>
              {step === 4 ? (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              ) : null}
              {isSaving
                ? "Saving..."
                : step === 4
                  ? "Finish Setup"
                  : "Continue"}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
