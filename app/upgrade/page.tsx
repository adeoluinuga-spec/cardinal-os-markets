import { Card } from "@/components/ui/Card";

export default function UpgradePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-pale px-4 py-10">
      <Card className="max-w-lg text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-gold">
          Subscription required
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">
          Upgrade to continue
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink2">
          Your trial has ended. Choose a Cardinal OS Markets plan to restore
          access to your workspace.
        </p>
      </Card>
    </main>
  );
}
