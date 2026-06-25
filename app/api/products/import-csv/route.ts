import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

type CsvProduct = {
  name?: string;
  sku?: string;
  category?: string;
  unit_price?: string | number;
  wholesale_price?: string | number;
  cost_price?: string | number;
  stock_quantity?: string | number;
  reorder_point?: string | number;
  unit?: string;
};

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as { rows?: CsvProduct[] };
  const rows = body.rows ?? [];

  if (!rows.length) {
    return NextResponse.json({ error: "No products to import." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const skus = rows.map((row) => String(row.sku ?? "").trim()).filter(Boolean);
  const { data: existing } = skus.length
    ? await supabase
        .from("products")
        .select("sku")
        .eq("tenant_id", normalizedTenant.id)
        .in("sku", skus)
    : { data: [] };
  const existingSkus = new Set((existing ?? []).map((row) => row.sku));
  const skipped = rows.filter((row) => row.sku && existingSkus.has(String(row.sku)));
  const inserts = rows
    .filter((row) => row.name && (!row.sku || !existingSkus.has(String(row.sku))))
    .map((row) => ({
      tenant_id: normalizedTenant.id,
      name: String(row.name).trim(),
      sku: row.sku ? String(row.sku).trim() : null,
      category: row.category ? String(row.category).trim() : null,
      unit_price: Number(row.unit_price ?? 0),
      wholesale_price: Number(row.wholesale_price ?? 0),
      cost_price: Number(row.cost_price ?? 0),
      stock_quantity: Number(row.stock_quantity ?? 0),
      reorder_point: Number(row.reorder_point ?? 5),
      unit: row.unit ? String(row.unit).trim() : "unit",
    }));

  if (inserts.length) {
    const { error } = await supabase.from("products").insert(inserts);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    imported: inserts.length,
    skipped: skipped.length,
  });
}
