import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function createSlug(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "business"}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId?: string;
    fullName?: string;
    businessName?: string;
    association?: string;
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

  if (body.association) {
    const { data: association } = await supabaseAdmin
      .from("associations")
      .select("id")
      .eq("slug", body.association)
      .maybeSingle();

    if (association) {
      await supabaseAdmin.from("association_members").insert({
        association_id: association.id,
        tenant_id: tenant.id,
      });
    }
  }

  return NextResponse.json({ tenant });
}
