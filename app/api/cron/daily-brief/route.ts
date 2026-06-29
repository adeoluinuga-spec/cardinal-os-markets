import { NextResponse } from "next/server";
import { generateTenantBrief } from "@/lib/dailyBrief";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendWhatsAppBrief } from "@/lib/termiiWhatsApp";

export const dynamic = "force-dynamic";

function lagosNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
}

function localDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function previousDate(date: Date) {
  const prior = new Date(date);
  prior.setDate(prior.getDate() - 1);
  return localDate(prior);
}

function isDue(tenant: { daily_brief_time?: string | null; daily_brief_frequency?: string | null; weekly_brief_day?: number | null }, now: Date) {
  const [hour = "18"] = (tenant.daily_brief_time ?? "18:00").split(":");
  if (Number(hour) !== now.getHours()) return false;
  if ((tenant.daily_brief_frequency ?? "daily") === "weekly") {
    return Number(tenant.weekly_brief_day ?? 1) === now.getDay();
  }
  return true;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = lagosNow();
  const sentForDate = previousDate(now);
  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, whatsapp_number, daily_brief_time, daily_brief_frequency, weekly_brief_day")
    .in("subscription_status", ["trial", "active"])
    .eq("daily_brief_enabled", true)
    .eq("whatsapp_opted_in", true)
    .not("whatsapp_number", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let sent = 0;
  let failed = 0;
  const failures: { tenant_id: string; error: string }[] = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const tenant of tenants ?? []) {
    if (!isDue(tenant, now)) continue;

    const { data: existing } = await supabaseAdmin
      .from("daily_brief_log")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("sent_for_date", sentForDate)
      .eq("channel", "whatsapp")
      .maybeSingle();
    if (existing) continue;

    try {
      const brief = await generateTenantBrief({
        tenant_id: tenant.id,
        sentForDate,
        frequency: tenant.daily_brief_frequency === "weekly" ? "weekly" : "daily",
      });
      const result = await sendWhatsAppBrief({
        number: tenant.whatsapp_number!,
        message: brief.message,
        businessName: tenant.name,
        dashboardUrl: `${appUrl}/app/dashboard`,
      });
      await supabaseAdmin.from("daily_brief_log").insert({
        tenant_id: tenant.id,
        sent_for_date: sentForDate,
        channel: "whatsapp",
        message_content: brief.message,
        status: result.status,
        termii_message_id: result.termii_message_id,
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "Unknown error";
      failures.push({ tenant_id: tenant.id, error: message });
      await supabaseAdmin.from("daily_brief_log").insert({
        tenant_id: tenant.id,
        sent_for_date: sentForDate,
        channel: "whatsapp",
        status: "failed",
        message_content: message,
      });
    }
  }

  return NextResponse.json({ sent, failed, failures });
}
