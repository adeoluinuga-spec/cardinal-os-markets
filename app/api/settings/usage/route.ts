import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";
import { getTierLimits, normalizeTier } from "@/lib/tiers";

export async function GET() {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const tier = normalizeTier(normalizedTenant.subscription_tier);
  const limits = getTierLimits(tier);
  const supabase = await createServerSupabaseClient();
  const tenantId = normalizedTenant.id;

  const [staff, customers, products, aiQueries, orders, smsMessages, autopilotActions] = await Promise.all([
    supabase
      .from("tenant_users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase.rpc("get_usage", { p_tenant_id: tenantId, p_metric: "ai_queries" }),
    supabase.rpc("get_usage", {
      p_tenant_id: tenantId,
      p_metric: "orders_this_month",
    }),
    supabase.rpc("get_usage", { p_tenant_id: tenantId, p_metric: "sms_messages" }),
    supabase.rpc("get_usage", { p_tenant_id: tenantId, p_metric: "autopilot_actions" }),
  ]);

  return NextResponse.json({
    tier,
    limits,
    usage: {
      max_staff: staff.count ?? 0,
      max_customers: customers.count ?? 0,
      max_products: products.count ?? 0,
      max_orders_per_month: orders.data ?? 0,
      max_ai_queries_per_month: aiQueries.data ?? 0,
      max_sms_per_month: smsMessages.data ?? 0,
      max_autopilot_actions_per_month: autopilotActions.data ?? 0,
    },
  });
}
