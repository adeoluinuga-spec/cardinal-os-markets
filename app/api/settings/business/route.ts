import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

const EDITABLE_FIELDS = [
  "name",
  "business_type",
  "phone",
  "address",
  "city",
  "ai_persona_name",
  "logo_url",
] as const;

const BUSINESS_TYPES = new Set([
  "electronics",
  "fashion",
  "jewelry",
  "beauty",
  "retail",
  "food",
  "building_materials",
  "auto_parts",
  "general_trade",
  "other",
]);

export async function GET() {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  return NextResponse.json({
    business: {
      id: t.id,
      name: t.name,
      business_type: t.business_type,
      phone: t.phone,
      address: t.address,
      city: t.city,
      ai_persona_name: t.ai_persona_name,
      logo_url: t.logo_url,
    },
  });
}

export async function PATCH(request: Request) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role || !["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const value = body[field];
      update[field] =
        typeof value === "string" ? value.trim() || null : (value ?? null);
    }
  }

  if (
    typeof update.name === "string" &&
    (update.name as string).length === 0
  ) {
    return NextResponse.json(
      { error: "Business name cannot be empty." },
      { status: 400 },
    );
  }
  if (
    update.business_type &&
    !BUSINESS_TYPES.has(update.business_type as string)
  ) {
    return NextResponse.json(
      { error: "Invalid business type." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tenants")
    .update(update)
    .eq("id", t.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ business: data });
}
