import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: { token: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*, tenant:tenants(id,name,logo_url), customer:customers(email)")
    .eq("tracking_token", params.token)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: bankAccounts } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name, account_number, account_name, is_primary")
    .eq("tenant_id", order.tenant_id)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  return NextResponse.json({
    order,
    bankAccounts: bankAccounts ?? [],
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? null,
  });
}
