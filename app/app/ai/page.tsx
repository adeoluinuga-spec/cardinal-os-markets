import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function AiAssistantPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Assistant" subtitle="For now, the active AI tools live in War Room briefs, Customer summaries, Company Brain, and Autopilot." />
      <Card>
        <p className="text-ink2">Use <Link className="font-semibold text-blue-primary" href="/app/autopilot">Autopilot</Link> for message-to-order extraction and daily action scanning.</p>
      </Card>
    </div>
  );
}
