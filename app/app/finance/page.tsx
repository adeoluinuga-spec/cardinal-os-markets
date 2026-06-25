import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Finance" subtitle="Light finance workspace for payment review and collections.">
        <Link href="/app/finance/payments" className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-dark">
          Open Payment Queue
        </Link>
      </PageHeader>
      <Card>
        <p className="text-ink2">Use Payment Queue to approve submitted payments and confirm balances. Full ledger reports will come after the core operating flows are stable.</p>
      </Card>
    </div>
  );
}
