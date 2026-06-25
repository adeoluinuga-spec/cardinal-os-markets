"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

type TrackPayload = {
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    status: string;
    expected_delivery_at: string | null;
    tenant: { name: string; logo_url: string | null };
  };
  delivery: {
    id: string;
    rider_name: string | null;
    delivered_at: string | null;
    proof_photo_url: string | null;
    status: string | null;
  } | null;
};

const stages = ["quote", "awaiting_payment", "confirmed", "packaged", "dispatched", "delivered"];

function formatLabel(value: string) {
  if (value === "awaiting_payment") return "Payment";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function TrackingPage() {
  const params = useParams<{ token: string }>();
  const [payload, setPayload] = useState<TrackPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/track/${params.token}`, {
        cache: "no-store",
      });
      if (response.ok) {
        setPayload((await response.json()) as TrackPayload);
      }
      setIsLoading(false);
    }
    void load();
  }, [params.token]);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload?.delivery?.id) return;
    const formData = new FormData();
    formData.append("delivery_id", payload.delivery.id);
    formData.append("otp", otp.join(""));
    const response = await fetch("/api/deliveries/confirm-otp", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Wrong code.");
      return;
    }
    setSuccess(true);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-pale">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-pale p-5">
        <Card className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Order not found.</h1>
        </Card>
      </main>
    );
  }

  const currentIndex = stages.indexOf(payload.order.status);

  return (
    <main className="min-h-screen bg-blue-pale p-4">
      <Card className="mx-auto max-w-lg">
        <div className="flex items-center gap-3">
          {payload.order.tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={payload.order.tenant.logo_url} alt="" className="h-10 w-10 rounded-full" />
          ) : null}
          <p className="font-display text-2xl font-bold text-blue-primary">
            {payload.order.tenant.name}
          </p>
        </div>
        <h1 className="mt-6 font-mono text-xl font-bold text-ink">
          {payload.order.order_number}
        </h1>
        <p className="mt-2 text-sm font-semibold text-ink2">
          {payload.order.customer_name}
        </p>
        <div className="mt-6 space-y-3">
          {stages.map((stage, index) => {
            const complete = index < currentIndex || payload.order.status === "delivered";
            const active = index === currentIndex;
            return (
              <div key={stage} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold",
                    complete
                      ? "border-green bg-green text-white"
                      : active
                        ? "border-blue-primary bg-blue-primary text-white"
                        : "border-blue-border bg-white text-ink3",
                  )}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <span className="font-semibold text-ink">{formatLabel(stage)}</span>
              </div>
            );
          })}
        </div>
        {success || payload.order.status === "delivered" ? (
          <div className="mt-6 rounded-xl bg-green-light p-4 text-center text-green">
            <CheckCircle2 className="mx-auto h-10 w-10" />
            <p className="mt-2 font-display text-2xl font-bold">Order delivered ✓</p>
            {payload.delivery?.delivered_at ? (
              <p className="mt-1 text-sm">{new Date(payload.delivery.delivered_at).toLocaleString()}</p>
            ) : null}
            {payload.delivery?.proof_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={payload.delivery.proof_photo_url} alt="Proof" className="mx-auto mt-4 h-24 rounded-lg object-cover" />
            ) : null}
          </div>
        ) : payload.order.status === "dispatched" && payload.delivery ? (
          <div className="mt-6">
            <Badge variant="blue">On the way</Badge>
            <p className="mt-3 text-sm leading-6 text-ink2">
              Your order is on the way with {payload.delivery.rider_name}. Expected:{" "}
              {payload.order.expected_delivery_at || "soon"}
            </p>
            <form onSubmit={confirm} className="mt-5 space-y-4">
              <p className="text-sm font-semibold text-ink">
                Received your order? Enter the code sent to your phone to confirm:
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
                    maxLength={1}
                    inputMode="numeric"
                    className="h-12 text-center text-xl font-bold"
                  />
                ))}
              </div>
              {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
              <Button type="submit" className="w-full">
                Confirm Receipt
              </Button>
            </form>
          </div>
        ) : null}
      </Card>
    </main>
  );
}
