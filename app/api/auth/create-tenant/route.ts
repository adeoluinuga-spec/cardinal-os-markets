import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function createSlug(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "business"
  );
}

export async function POST() {
  // Identify the caller from their verified session — never trust a user id
  // from the request body.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Idempotent: if this user already has a workspace, return it instead of
  // creating a duplicate (handles retries / double submits).
  const { data: existing } = await supabaseAdmin
    .from("tenant_users")
    .select("tenant:tenants(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  const existingTenant = Array.isArray(existing?.tenant)
    ? existing?.tenant[0]
    : existing?.tenant;
  if (existingTenant) {
    return NextResponse.json({ tenant: existingTenant });
  }

  const metadata = user.user_metadata ?? {};
  const fullName = String(metadata.full_name ?? "").trim();
  const businessName = String(metadata.business_name ?? "").trim();
  const associationSlug = String(metadata.association_slug ?? "").trim();

  if (!businessName) {
    return NextResponse.json(
      { error: "Missing business details from signup." },
      { status: 400 },
    );
  }

  const tenantSlug = createSlug(businessName);

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: businessName,
      slug: tenantSlug,
      owner_id: user.id,
    })
    .select("*")
    .single();

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 400 });
  }

  const { error: tenantUserError } = await supabaseAdmin
    .from("tenant_users")
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: "ceo",
      full_name: fullName || user.email || "Owner",
    });

  if (tenantUserError) {
    return NextResponse.json(
      { error: tenantUserError.message },
      { status: 400 },
    );
  }

  if (associationSlug) {
    const { data: association } = await supabaseAdmin
      .from("associations")
      .select("id, name")
      .eq("slug", associationSlug)
      .maybeSingle();

    if (association) {
      await supabaseAdmin.from("association_members").upsert(
        {
          association_id: association.id,
          tenant_id: tenant.id,
        },
        { onConflict: "association_id,tenant_id" },
      );
      await supabaseAdmin
        .from("tenants")
        .update({ market_association: association.name })
        .eq("id", tenant.id);
    }
  }

  return NextResponse.json({ tenant });
}
