import { NextResponse } from "next/server";
import { getCurrentUserWithTenant, createServerSupabaseClient } from "@/lib/serverAuth";
import { isAtLimit, normalizeTier, getTierLimits } from "@/lib/tiers";

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const tier = normalizeTier(normalizedTenant.subscription_tier);

  const supabase = await createServerSupabaseClient();
  const { count: customerCount } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", normalizedTenant.id);

  if (isAtLimit(tier, "max_customers", customerCount ?? 0)) {
    return NextResponse.json(
      {
        error: "LIMIT_REACHED",
        message: "You have reached the maximum customer limit for your plan.",
        limit: getTierLimits(tier).max_customers,
        current: customerCount ?? 0,
        upgrade_required: true,
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    full_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    customer_type?: string;
    notes?: string;
  };

  if (!body.full_name?.trim()) {
    return NextResponse.json(
      { error: "Customer name is required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: normalizedTenant.id,
      full_name: body.full_name.trim(),
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      customer_type: body.customer_type || "retail",
      notes: body.notes?.trim() || null,
      health_score: 25,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ customer: data });
}
