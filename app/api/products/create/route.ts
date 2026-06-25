import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

function generateSku(name: string) {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "SKU";
  return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as {
    name?: string;
    sku?: string;
    category?: string;
    description?: string;
    unit_price?: number;
    wholesale_price?: number;
    cost_price?: number;
    stock_quantity?: number;
    reorder_point?: number;
    unit?: string;
  };

  if (!body.name?.trim() || body.unit_price === undefined) {
    return NextResponse.json(
      { error: "Product name and retail price are required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      tenant_id: normalizedTenant.id,
      name: body.name.trim(),
      sku: body.sku?.trim() || generateSku(body.name),
      category: body.category?.trim() || null,
      description: body.description?.trim() || null,
      unit_price: Number(body.unit_price),
      wholesale_price: Number(body.wholesale_price ?? 0),
      cost_price: Number(body.cost_price ?? 0),
      stock_quantity: Number(body.stock_quantity ?? 0),
      reorder_point: Number(body.reorder_point ?? 5),
      unit: body.unit?.trim() || "unit",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ product: data });
}
