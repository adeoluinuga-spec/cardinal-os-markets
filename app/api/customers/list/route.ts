import { NextResponse } from "next/server";
import { calculateCustomerHealth } from "@/lib/customerHealth";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

export async function GET(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const type = searchParams.get("type")?.trim();
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", normalizedTenant.id)
    .order("created_at", { ascending: false });

  if (type && type !== "all") {
    query = query.eq("customer_type", type);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const customers = (data ?? []).map((customer) => ({
    ...customer,
    health_score: calculateCustomerHealth(customer),
  }));

  await Promise.all(
    customers.map((customer) =>
      supabase
        .from("customers")
        .update({ health_score: customer.health_score })
        .eq("tenant_id", normalizedTenant.id)
        .eq("id", customer.id),
    ),
  );

  return NextResponse.json({ customers });
}
