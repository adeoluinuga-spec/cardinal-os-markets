import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

type CancelBody = {
  reason?: string;
  feedback?: string;
  save_offer?: string;
};

export async function POST(request: Request) {
  const { tenant, user, role } = await getCurrentUserWithTenant();

  if (!tenant || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["owner", "admin"].includes(String(role))) {
    return NextResponse.json(
      { error: "Only owners and admins can cancel a subscription." },
      { status: 403 },
    );
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as CancelBody;
  const reason = body.reason?.trim();

  if (!reason) {
    return NextResponse.json(
      { error: "Please select a reason before cancelling." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error: updateError } = await supabase
    .from("tenants")
    .update({ subscription_status: "cancelled" })
    .eq("id", normalizedTenant.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await supabase.from("subscription_events").insert({
    tenant_id: normalizedTenant.id,
    event_type: "subscription.cancelled_by_customer",
    tier: normalizedTenant.subscription_tier,
    amount_naira: 0,
    paystack_reference: null,
    metadata: {
      reason,
      feedback: body.feedback?.trim() || null,
      save_offer: body.save_offer || null,
      cancelled_by: user.id,
      cancelled_by_email: user.email ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
