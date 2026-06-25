"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName,
        },
      },
    });

    if (signUpError || !data.user) {
      setIsSubmitting(false);
      setError(signUpError?.message ?? "Unable to create your account.");
      return;
    }

    const response = await fetch("/api/auth/create-tenant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: data.user.id,
        fullName,
        businessName,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "Unable to create your business workspace.");
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-pale px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-primary font-display text-2xl font-bold text-white shadow-lg shadow-blue-primary/20">
            C
          </div>
          <p className="font-display text-2xl font-bold text-blue-primary">
            Cardinal OS Markets
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            Create your account
          </h1>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink2">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Full name
              </span>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink2">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email
              </span>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink2">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                Password
              </span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink2">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Business name
              </span>
              <Input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                required
              />
            </label>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink2">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-primary hover:text-blue-dark"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
