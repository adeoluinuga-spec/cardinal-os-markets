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

const nextStatus: Record<string, string> = {
  quote: "awaiting_payment",
  awaiting_payment: "confirmed",
  confirmed: "packaged",
  production: "packaged",
  packaged: "dispatched",
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (order.status === "awaiting_payment" && order.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Payment must be paid before confirming this order." },
      { status: 400 },
    );
  }

  const status = nextStatus[order.status];

  if (!status) {
    return NextResponse.json(
      { error: "This order cannot be advanced further here." },
      { status: 400 },
    );
  }

  const { data, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", params.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ order: data });
}
