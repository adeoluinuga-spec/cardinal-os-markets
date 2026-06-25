import { NextResponse } from "next/server";
import { isValidDeliveryKey } from "@/lib/deliverySecurity";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: { id: string } };

export async function GET(request: Request, { params }: RouteContext) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!isValidDeliveryKey(params.id, key)) {
    return NextResponse.json(
      { error: "Invalid or expired link." },
      { status: 403 },
    );
  }

  const { data: delivery, error } = await supabaseAdmin
    .from("deliveries")
    .select("*, order:orders(*)")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_name, quantity")
    .eq("order_id", delivery.order_id);

  return NextResponse.json({
    delivery,
    order: delivery.order,
    items: items ?? [],
  });
}
