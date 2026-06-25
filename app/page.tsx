import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="min-h-screen bg-blue-pale">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-blue-border bg-white px-3 py-2 shadow-sm shadow-blue-dark/5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-primary text-white">
                <Store className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-blue-primary">
                Cardinal OS Markets
              </span>
            </div>

            <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
              Run your Marketplace
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink2 sm:text-lg">
              Manage orders, customers, products, payments, dispatch, and your
              AI business assistant from a self-serve operating system built for
              Nigerian traders.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-dark"
              >
                Create account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold text-blue-primary transition hover:bg-blue-light"
              >
                Sign in
              </Link>
            </div>
          </div>

          <Card className="p-5 sm:p-6">
            <div className="rounded-lg bg-blue-dark p-5 text-white">
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-blue-light">
                War Room
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Today's Revenue", "₦0"],
                  ["Orders Today", "0"],
                  ["Outstanding", "₦0"],
                  ["Active Customers", "0"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-white/10 bg-white/10 p-4"
                  >
                    <p className="font-display text-2xl font-bold">{value}</p>
                    <p className="mt-2 text-xs font-semibold text-blue-light">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-white p-4 text-ink">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green" />
                  <p className="font-mono text-xs font-bold uppercase text-blue-primary">
                    AI Morning Brief
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink2">
                  Your live business summary will appear here after you sign in
                  and complete onboarding.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
