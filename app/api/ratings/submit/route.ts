import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  const { data: order, error: orderError } = await supabaseAdmin.from("orders").select("id, tenant_id").eq("tracking_token", body.token).single();
  if (orderError) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const { error } = await supabaseAdmin.from("ratings").upsert({
    tenant_id: order.tenant_id, order_id: order.id, score: Number(body.score), comment: body.comment || null,
  }, { onConflict: "order_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
