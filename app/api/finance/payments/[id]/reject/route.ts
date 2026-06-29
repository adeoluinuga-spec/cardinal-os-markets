import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

type RouteContext = { params: { id: string } };

function isVerifier(role: string | null) {
  return ["ceo", "owner", "admin", "finance"].includes(role ?? "");
}

export async function POST(request: Request, { params }: RouteContext) {
  const { tenant, role, user } = await getCurrentUserWithTenant();

  if (!tenant || !user || !isVerifier(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { reason } = (await request.json()) as { reason?: string };
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Reason for rejection is required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "rejected",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      notes: reason.trim(),
    })
    .eq("tenant_id", t.id)
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Payment rejected." });
}
