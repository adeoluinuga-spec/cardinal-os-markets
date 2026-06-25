"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

type DeliveryPayload = {
  delivery: {
    id: string;
    proof_photo_url: string | null;
    delivered_at: string | null;
    status: string | null;
  } | null;
  order: {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    delivery_address: string | null;
    order_number: string;
  };
  items: { product_name: string; quantity: number }[];
};

export default function RiderDeliveryPage() {
  const params = useParams<{ delivery_id: string }>();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [payload, setPayload] = useState<DeliveryPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [proof, setProof] = useState<File | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = useMemo(() => (proof ? URL.createObjectURL(proof) : ""), [proof]);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/deliveries/${params.delivery_id}?key=${key}`);
      if (!response.ok) {
        setError("Invalid or expired link.");
        setIsLoading(false);
        return;
      }
      const data = (await response.json()) as DeliveryPayload;
      setPayload(data);
      setIsLoading(false);
    }
    void load();
  }, [key, params.delivery_id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!proof) {
      setError("Upload proof photo before entering OTP.");
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("delivery_id", params.delivery_id);
    formData.append("key", key);
    formData.append("otp", otp.join(""));
    formData.append("proof", proof);
    const response = await fetch("/api/deliveries/confirm-otp", {
      method: "POST",
      body: formData,
    });
    setIsSubmitting(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to confirm delivery.");
      return;
    }
    setIsSuccess(true);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-pale">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-green-light p-5 text-center">
        <Card className="max-w-md">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green" />
          <h1 className="mt-4 font-display text-3xl font-bold text-green">
            Delivery Confirmed!
          </h1>
        </Card>
      </main>
    );
  }

  if (error && !payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-pale p-5">
        <Card className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-ink">
            Invalid or expired link.
          </h1>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-pale p-4">
      <Card className="mx-auto max-w-lg">
        <p className="font-display text-2xl font-bold text-blue-primary">
          Cardinal OS Markets
        </p>
        <h1 className="mt-5 font-display text-3xl font-bold text-ink">
          Delivery Job
        </h1>
        <p className="mt-4 text-lg font-bold text-ink">
          {payload?.order.customer_name}
        </p>
        <p className="mt-4 rounded-xl bg-blue-pale p-4 text-xl font-semibold leading-8 text-ink">
          {payload?.order.delivery_address || "No delivery address provided"}
        </p>
        {payload?.order.customer_phone ? (
          <a
            href={`tel:${payload.order.customer_phone}`}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-primary font-semibold text-white"
          >
            <Phone className="h-5 w-5" />
            Call Customer
          </a>
        ) : null}
        <div className="my-6 border-t border-blue-border" />
        <ul className="space-y-2 text-sm text-ink2">
          {payload?.items.map((item) => (
            <li key={item.product_name}>
              {item.product_name} x{item.quantity}
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-blue-border bg-blue-pale p-6 text-blue-primary"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Proof preview" className="h-40 rounded-lg object-cover" />
            ) : (
              <>
                <Camera className="h-10 w-10" />
                <span className="mt-2 font-semibold">Upload proof photo</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setProof(event.target.files?.[0] ?? null)}
          />
          <p className="text-center text-sm font-semibold text-ink2">
            Enter the code the customer gives you
          </p>
          <div className="grid grid-cols-6 gap-2">
            {otp.map((digit, index) => (
              <Input
                key={index}
                value={digit}
                onChange={(event) => {
                  const next = [...otp];
                  next[index] = event.target.value.replace(/\D/g, "").slice(0, 1);
                  setOtp(next);
                }}
                className="h-12 text-center text-xl font-bold"
                inputMode="numeric"
                maxLength={1}
              />
            ))}
          </div>
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
          <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Confirming..." : "Confirm Delivery"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
