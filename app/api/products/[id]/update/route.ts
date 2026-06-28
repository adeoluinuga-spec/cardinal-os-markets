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

export async function PATCH(request: Request, { params }: RouteContext) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as {
    name?: string;
    sku?: string | null;
    category?: string | null;
    description?: string | null;
    unit_price?: number;
    wholesale_price?: number;
    cost_price?: number;
    stock_quantity?: number;
    reorder_point?: number;
    unit?: string;
    image_urls?: string[];
  };

  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "Product name is required." },
      { status: 400 },
    );
  }

  const update = {
    name: body.name.trim(),
    sku: body.sku?.trim() || null,
    category: body.category?.trim() || null,
    description: body.description?.trim() || null,
    unit_price: Number(body.unit_price ?? 0),
    wholesale_price: Number(body.wholesale_price ?? 0),
    cost_price: Number(body.cost_price ?? 0),
    stock_quantity: Number(body.stock_quantity ?? 0),
    reorder_point: Number(body.reorder_point ?? 5),
    unit: body.unit?.trim() || "unit",
    image_urls: Array.isArray(body.image_urls) ? body.image_urls.slice(0, 3) : [],
  };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ product: data });
}
