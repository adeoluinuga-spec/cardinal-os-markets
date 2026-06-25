import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function GET() {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("incoming_stock").select("*").eq("tenant_id", t.id).order("received_at", { ascending: false });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = await request.json();
  const supabase = await createServerSupabaseClient();
  const { data: product, error: productError } = await supabase.from("products").select("name, stock_quantity").eq("tenant_id", t.id).eq("id", body.product_id).single();
  if (productError) return NextResponse.json({ error: productError.message }, { status: 404 });
  const qty = Number(body.quantity ?? 0);
  const { error } = await supabase.from("incoming_stock").insert({
    tenant_id: t.id, product_id: body.product_id, product_name: product.name, quantity: qty,
    supplier_name: body.supplier_name || null, notes: body.notes || null,
    received_at: body.received_at || new Date().toISOString().slice(0, 10), received_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from("products").update({ stock_quantity: Number(product.stock_quantity ?? 0) + qty }).eq("tenant_id", t.id).eq("id", body.product_id);
  return NextResponse.json({ ok: true });
}
