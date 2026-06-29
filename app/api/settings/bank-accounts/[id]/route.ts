import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

type RouteContext = { params: { id: string } };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role || !["ceo", "owner", "admin", "finance"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, is_primary")
    .eq("tenant_id", t.id)
    .eq("is_active", true);

  const active = accounts ?? [];
  if (active.length <= 1) {
    return NextResponse.json(
      { error: "You must keep at least one bank account." },
      { status: 400 },
    );
  }

  const target = active.find((a) => a.id === params.id);
  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("tenant_id", t.id)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If we removed the primary account, promote the next remaining one.
  if (target.is_primary) {
    const next = active.find((a) => a.id !== params.id);
    if (next) {
      await supabase
        .from("bank_accounts")
        .update({ is_primary: true })
        .eq("tenant_id", t.id)
        .eq("id", next.id);
    }
  }

  return NextResponse.json({ ok: true });
}
