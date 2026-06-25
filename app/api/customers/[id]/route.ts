import { NextResponse } from "next/server";
import { calculateCustomerHealth } from "@/lib/customerHealth";
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
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", params.id)
    .single();

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 404 });
  }

  const healthScore = calculateCustomerHealth(customer);
  await supabase
    .from("customers")
    .update({ health_score: healthScore })
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", params.id);

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, total, status, created_at")
    .eq("tenant_id", normalizedTenant.id)
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 400 });
  }

  return NextResponse.json({
    customer: {
      ...customer,
      health_score: healthScore,
    },
    orders: orders ?? [],
  });
}
