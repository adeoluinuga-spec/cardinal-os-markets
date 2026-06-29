import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function GET(request: Request) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant || !["ceo", "owner", "admin"].includes(role ?? "")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const p = new URL(request.url).searchParams;
  const supabase = await createServerSupabaseClient();
  let q = supabase.from("activity_log").select("*").eq("tenant_id", t.id).order("changed_at", { ascending: false }).limit(100);
  if (p.get("table")) q = q.eq("table_name", p.get("table"));
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ logs: data ?? [] });
}
