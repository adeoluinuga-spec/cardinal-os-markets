import { NextResponse } from "next/server";
import { getCurrentUserWithTenant } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: { id: string } };

const ASSIGNABLE_ROLES = new Set([
  "admin",
  "sales_agent",
  "logistics",
  "warehouse",
  "finance",
  "rider",
  "viewer",
]);

export async function PATCH(request: Request, { params }: RouteContext) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role || !["ceo", "owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { role: newRole } = (await request.json()) as { role?: string };
  if (!newRole || !ASSIGNABLE_ROLES.has(newRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  // Never change the CEO/owner role from this staff-management screen.
  const { data: target } = await supabaseAdmin
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", t.id)
    .eq("id", params.id)
    .maybeSingle();
  if (target?.role === "ceo" || target?.role === "owner") {
    return NextResponse.json(
      { error: "The CEO/owner role cannot be changed here." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .update({ role: newRole })
    .eq("tenant_id", t.id)
    .eq("id", params.id)
    .select("id, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ member: data });
}
