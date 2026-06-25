import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { order_id } = await request.json();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("orders").update({ pickup_code: code, fulfillment_type: "pickup" }).eq("tenant_id", t.id).eq("id", order_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ code });
}
