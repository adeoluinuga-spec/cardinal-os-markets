import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function GET() {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("orders").select("*").eq("tenant_id", t.id).neq("status", "delivered").or("fulfillment_type.eq.pickup,delivery_address.is.null").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orders: data ?? [] });
}
