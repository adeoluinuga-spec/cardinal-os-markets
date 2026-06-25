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

export async function GET(_request: Request, { params }: RouteContext) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, customer:customers(*)")
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("tenant_id", normalizedTenant.id)
      .eq("order_id", params.id),
    supabase
      .from("payments")
      .select("*")
      .eq("tenant_id", normalizedTenant.id)
      .eq("order_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    order,
    items: items ?? [],
    payments: payments ?? [],
    tenant: normalizedTenant,
  });
}
