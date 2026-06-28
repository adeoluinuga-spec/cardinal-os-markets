"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!email) {
      setError("Missing email address. Please sign up again.");
      return;
    }

    setIsSubmitting(true);

    // Exchange the emailed code for a real session. type "signup" matches the
    // confirmation email Supabase sent when the account was created.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "signup",
    });

    if (verifyError) {
      setIsSubmitting(false);
      setError(verifyError.message || "That code is invalid or has expired.");
      return;
    }

    // We now have a verified session — provision the workspace from the
    // metadata captured at signup, then continue to onboarding.
    const response = await fetch("/api/auth/create-tenant", { method: "POST" });
    setIsSubmitting(false);

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "Unable to create your business workspace.");
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  }

  async function handleResend() {
    setError("");
    setInfo("");
    if (!email) {
      setError("Missing email address. Please sign up again.");
      return;
    }
    setIsResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setIsResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setInfo("A new code is on its way to your inbox.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-pale px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-primary text-white shadow-lg shadow-blue-primary/20">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-bold text-blue-primary">
            Cardinal OS Markets
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            Verify your email
          </h1>
          <p className="mt-2 text-sm text-ink2">
            We sent a verification code to{" "}
            <span className="font-semibold text-ink">{email || "your email"}</span>.
            Enter it below to continue.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink2">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Verification code
              </span>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
              />
            </label>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}
            {info ? (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                {info}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify & continue"}
            </Button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="mt-4 w-full text-center text-sm font-semibold text-blue-primary hover:text-blue-dark disabled:opacity-60"
          >
            {isResending ? "Sending..." : "Resend code"}
          </button>

          <p className="mt-6 text-center text-sm text-ink2">
            Entered the wrong email?{" "}
            <Link
              href="/signup"
              className="font-semibold text-blue-primary hover:text-blue-dark"
            >
              Start over
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-blue-pale px-4 py-10">
          <Card className="w-full max-w-md p-6 text-center text-sm font-semibold text-ink2">
            Loading...
          </Card>
        </main>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
