"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type Activity = { id: string; table_name: string; action: string; record_id: string; changed_at: string };

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<Activity[]>([]);

  useEffect(() => {
    fetch("/api/activity", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { logs?: Activity[] }) => setLogs(data.logs ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Log" subtitle="Owner/admin audit trail for important record changes." />
      <div className="space-y-3">
        {logs.length === 0 ? <Card>No activity recorded yet.</Card> : null}
        {logs.map((log) => (
          <Card key={log.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-ink">{log.table_name}</p>
              <p className="font-mono text-xs text-ink3">{log.record_id}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={log.action === "DELETE" ? "red" : "blue"}>{log.action}</Badge>
              <span className="text-sm text-ink2">{new Date(log.changed_at).toLocaleString()}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
