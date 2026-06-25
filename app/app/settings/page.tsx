import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { UsageMeters } from "@/components/settings/UsageMeters";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Light settings area for operational admin." />
      <UsageMeters />
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/app/settings/activity">
          <Card className="transition hover:border-blue-primary">
            <p className="font-semibold text-ink">Activity Log</p>
            <p className="mt-1 text-sm text-ink2">View owner/admin audit trail.</p>
          </Card>
        </Link>
        <Link href="/upgrade">
          <Card className="transition hover:border-blue-primary">
            <p className="font-semibold text-ink">Subscription &amp; Plans</p>
            <p className="mt-1 text-sm text-ink2">Compare tiers and upgrade.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
