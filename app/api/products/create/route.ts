import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";
import { getTierLimits, isAtLimit, normalizeTier } from "@/lib/tiers";

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
    image_urls?: string[];
  };

  if (!body.name?.trim() || body.unit_price === undefined) {
    return NextResponse.json(
      { error: "Product name and retail price are required." },
      { status: 400 },
    );
  }

  const tier = normalizeTier(normalizedTenant.subscription_tier);
  const supabase = await createServerSupabaseClient();
  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", normalizedTenant.id);

  if (isAtLimit(tier, "max_products", productCount ?? 0)) {
    return NextResponse.json(
      {
        error: "LIMIT_REACHED",
        message: "You have reached the maximum product limit for your plan.",
        limit: getTierLimits(tier).max_products,
        current: productCount ?? 0,
        upgrade_required: true,
      },
      { status: 403 },
    );
  }

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
      image_urls: Array.isArray(body.image_urls) ? body.image_urls.slice(0, 3) : [],
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ product: data });
}
