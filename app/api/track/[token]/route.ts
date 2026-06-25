import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: { token: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*, tenant:tenants(name, logo_url, address), customer:customers(full_name, phone, customer_type)")
    .eq("tracking_token", params.token)
    .single();

  if (error) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: delivery } = await supabaseAdmin
    .from("deliveries")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  return NextResponse.json({ order, delivery, items: items ?? [] });
}
