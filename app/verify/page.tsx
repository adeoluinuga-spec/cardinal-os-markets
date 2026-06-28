"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const CODE_LENGTH = 8;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(() =>
    Array(CODE_LENGTH).fill(""),
  );
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const hasAutoSubmitted = useRef(false);

  // Focus the first box on mount.
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const verifyCode = useCallback(
    async (code: string) => {
      if (!email) {
        setError("Missing email address. Please sign up again.");
        return;
      }

      setError("");
      setInfo("");
      setIsSubmitting(true);

      // Exchange the emailed code for a real session. type "signup" matches the
      // confirmation email Supabase sent when the account was created.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });

      if (verifyError) {
        setIsSubmitting(false);
        hasAutoSubmitted.current = false;
        setDigits(Array(CODE_LENGTH).fill(""));
        inputsRef.current[0]?.focus();
        setError(verifyError.message || "That code is invalid or has expired.");
        return;
      }

      // We now have a verified session — provision the workspace from the
      // metadata captured at signup, then continue to onboarding.
      const response = await fetch("/api/auth/create-tenant", {
        method: "POST",
      });
      setIsSubmitting(false);

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setError(result.error ?? "Unable to create your business workspace.");
        return;
      }

      router.replace("/onboarding");
      router.refresh();
    },
    [email, router],
  );

  function commitDigits(next: string[]) {
    setDigits(next);
    const code = next.join("");
    if (code.length === CODE_LENGTH && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      void verifyCode(code);
    }
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    // Support typing/pasting several digits starting at this box.
    for (let i = 0; i < value.length && index + i < CODE_LENGTH; i += 1) {
      next[index + i] = value[i];
    }
    const lastFilled = Math.min(index + value.length, CODE_LENGTH - 1);
    inputsRef.current[lastFilled]?.focus();
    commitDigits(next);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        next[index - 1] = "";
        setDigits(next);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
    commitDigits(next);
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
    hasAutoSubmitted.current = false;
    setDigits(Array(CODE_LENGTH).fill(""));
    inputsRef.current[0]?.focus();
    setInfo("A new code is on its way to your inbox.");
  }

  const code = digits.join("");

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
            We sent an {CODE_LENGTH}-digit code to{" "}
            <span className="font-semibold text-ink">
              {email || "your email"}
            </span>
            . Enter it below to continue.
          </p>
        </div>

        <Card className="p-6">
          <div
            className="flex justify-between gap-1.5 sm:gap-2"
            role="group"
            aria-label="Verification code"
          >
            {digits.map((digit, index) => (
              <input
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={CODE_LENGTH}
                value={digit}
                disabled={isSubmitting}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                aria-label={`Digit ${index + 1}`}
                className={cn(
                  "h-12 w-full min-w-0 rounded-lg border bg-blue-pale text-center font-display text-lg font-bold text-ink outline-none transition sm:h-14 sm:rounded-xl sm:text-2xl",
                  "focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  digit ? "border-blue-primary bg-white" : "border-blue-border",
                )}
              />
            ))}
          </div>

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              {info}
            </p>
          ) : null}

          <Button
            type="button"
            className="mt-5 w-full"
            disabled={isSubmitting || code.length !== CODE_LENGTH}
            onClick={() => verifyCode(code)}
          >
            {isSubmitting ? "Verifying..." : "Verify & continue"}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="mt-4 w-full text-center text-sm font-semibold text-blue-primary hover:text-blue-dark disabled:opacity-60"
          >
            {isResending ? "Sending..." : "Didn't get a code? Resend"}
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
