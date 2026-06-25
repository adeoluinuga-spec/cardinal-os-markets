import { NextResponse } from "next/server";
import { getCurrentUserWithTenant, createServerSupabaseClient } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
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

  const supabase = await createServerSupabaseClient();
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
