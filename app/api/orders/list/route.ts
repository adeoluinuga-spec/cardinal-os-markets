import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

const orderStatuses = [
  "quote",
  "awaiting_payment",
  "confirmed",
  "packaged",
  "dispatched",
  "delivered",
  "cancelled",
];

export async function GET(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";
  const supabase = await createServerSupabaseClient();

  let ordersQuery = supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", normalizedTenant.id)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    ordersQuery = ordersQuery.eq("status", status);
  }

  const [{ data: orders, error }, { data: countRows }] = await Promise.all([
    ordersQuery,
    supabase.from("orders").select("status").eq("tenant_id", normalizedTenant.id),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const counts = {
    all: countRows?.length ?? 0,
    ...Object.fromEntries(orderStatuses.map((item) => [item, 0])),
  };

  for (const row of countRows ?? []) {
    counts[row.status as keyof typeof counts] =
      (counts[row.status as keyof typeof counts] ?? 0) + 1;
  }

  return NextResponse.json({ orders: orders ?? [], counts });
}
