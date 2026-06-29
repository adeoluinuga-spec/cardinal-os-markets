import { NextResponse } from "next/server";
import { generateTenantBrief } from "@/lib/dailyBrief";
import { getCurrentUserWithTenant } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendWhatsAppBrief } from "@/lib/termiiWhatsApp";

export async function POST() {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ceo", "owner", "admin"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { data: current } = await supabaseAdmin
    .from("tenants")
    .select("id, name, whatsapp_number")
    .eq("id", t.id)
    .maybeSingle();
  if (!current?.whatsapp_number) {
    return NextResponse.json(
      { error: "Add a WhatsApp number first." },
      { status: 400 },
    );
  }

  const brief = await generateTenantBrief({ tenant_id: t.id });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const result = await sendWhatsAppBrief({
    number: current.whatsapp_number,
    message: brief.message,
    businessName: current.name,
    dashboardUrl: `${appUrl}/app/dashboard`,
  });

  return NextResponse.json({
    message: brief.message,
    termii_message_id: result.termii_message_id,
    status: result.status,
  });
}
