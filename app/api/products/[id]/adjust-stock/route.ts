import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  const { tenant, user } = await getCurrentUserWithTenant();

  if (!tenant || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as {
    quantity?: number;
    reason?: string;
    direction?: "add" | "remove";
  };
  const quantity = Math.max(0, Number(body.quantity ?? 0));

  if (!quantity || !body.reason || !body.direction) {
    return NextResponse.json(
      { error: "Quantity, reason, and direction are required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", params.id)
    .single();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 404 });
  }

  const previousQuantity = Number(product.stock_quantity ?? 0);
  const newQuantity =
    body.direction === "add"
      ? previousQuantity + quantity
      : Math.max(0, previousQuantity - quantity);

  const { error: updateError } = await supabase
    .from("products")
    .update({ stock_quantity: newQuantity })
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await supabase.from("product_stock_adjustments").insert({
    tenant_id: normalizedTenant.id,
    product_id: params.id,
    quantity,
    direction: body.direction,
    reason: body.reason,
    previous_quantity: previousQuantity,
    new_quantity: newQuantity,
    adjusted_by: user.id,
  });

  return NextResponse.json({ stock_quantity: newQuantity });
}
