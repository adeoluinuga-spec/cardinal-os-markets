import { NextResponse } from "next/server";
import { getCurrentUserWithTenant } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: { id: string } };

export async function POST(request: Request, { params }: RouteContext) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role || !["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { is_active } = (await request.json().catch(() => ({}))) as {
    is_active?: boolean;
  };
  // Default action is to deactivate; pass { is_active: true } to reactivate.
  const nextActive = is_active === true;

  const { data: target } = await supabaseAdmin
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", t.id)
    .eq("id", params.id)
    .maybeSingle();
  if (target?.role === "owner") {
    return NextResponse.json(
      { error: "The owner cannot be deactivated." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .update({ is_active: nextActive })
    .eq("tenant_id", t.id)
    .eq("id", params.id)
    .select("id, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ member: data });
}
