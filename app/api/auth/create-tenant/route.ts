import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "business";
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId?: string;
    fullName?: string;
    businessName?: string;
    associationSlug?: string;
  };

  if (!body.userId || !body.fullName || !body.businessName) {
    return NextResponse.json(
      { error: "Missing required signup details." },
      { status: 400 },
    );
  }

  const tenantSlug = createSlug(body.businessName);

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: body.businessName,
      slug: tenantSlug,
      owner_id: body.userId,
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
      user_id: body.userId,
      role: "owner",
      full_name: body.fullName,
    });

  if (tenantUserError) {
    return NextResponse.json(
      { error: tenantUserError.message },
      { status: 400 },
    );
  }

  if (body.associationSlug) {
    const { data: association } = await supabaseAdmin
      .from("associations")
      .select("id, name")
      .eq("slug", body.associationSlug)
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
