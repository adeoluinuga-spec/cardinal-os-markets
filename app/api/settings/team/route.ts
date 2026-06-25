import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

export async function GET() {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_users")
    .select("id, user_id, full_name, role, phone, is_active, created_at")
    .eq("tenant_id", t.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ members: data ?? [] });
}
