import { NextResponse } from "next/server";
import { getCurrentUserWithTenant } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTierLimits, isAtLimit, normalizeTier } from "@/lib/tiers";

const ASSIGNABLE_ROLES = new Set([
  "admin",
  "sales_agent",
  "warehouse",
  "finance",
  "rider",
  "viewer",
]);

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function generateTempPassword() {
  // A readable, sufficiently strong temporary password.
  return `Cardinal-${Math.random().toString(36).slice(2, 8)}${Math.floor(
    1000 + Math.random() * 9000,
  )}`;
}

export async function POST(request: Request) {
  const { tenant, user, role } = await getCurrentUserWithTenant();
  if (!tenant || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role || !["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as {
    full_name?: string;
    email?: string;
    role?: string;
  };

  const fullName = body.full_name?.trim();
  const email = body.email?.trim().toLowerCase();
  const memberRole = body.role ?? "";

  if (!fullName || !email) {
    return NextResponse.json(
      { error: "Full name and email are required." },
      { status: 400 },
    );
  }
  if (!ASSIGNABLE_ROLES.has(memberRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  // Enforce the plan's staff limit.
  const tier = normalizeTier(t.subscription_tier);
  const { count: staffCount } = await supabaseAdmin
    .from("tenant_users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", t.id)
    .eq("is_active", true);
  if (isAtLimit(tier, "max_staff", staffCount ?? 0)) {
    return NextResponse.json(
      {
        error: "LIMIT_REACHED",
        message: "You have reached the maximum staff limit for your plan.",
        limit: getTierLimits(tier).max_staff,
        current: staffCount ?? 0,
        upgrade_required: true,
      },
      { status: 403 },
    );
  }

  // 1. Create the auth user with a temporary password.
  const tempPassword = generateTempPassword();
  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, tenant_id: t.id, role: memberRole },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Could not create the user." },
      { status: 400 },
    );
  }

  // 2. Link them to the tenant.
  const { error: linkError } = await supabaseAdmin.from("tenant_users").upsert(
    {
      tenant_id: t.id,
      user_id: created.user.id,
      role: memberRole,
      full_name: fullName,
      invited_by: user.id,
      is_active: true,
    },
    { onConflict: "tenant_id,user_id" },
  );

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  // 3. Send the welcome email with the temp password.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let emailed = false;
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cardinal OS Markets <onboarding@markets.cardinal.stuartdavidson.org>",
        to: email,
        subject: `You've been added to ${t.name} on Cardinal OS Markets`,
        html: `
          <p>Hi ${fullName},</p>
          <p>You've been added to <strong>${t.name}</strong> on Cardinal OS Markets as ${roleLabel(memberRole)}.</p>
          <p><strong>Login email:</strong> ${email}<br/>
          <strong>Temporary password:</strong> ${tempPassword}</p>
          <p>Sign in at <a href="${appUrl}/login">${appUrl}/login</a> and change your password.</p>
        `,
      }),
    });
    emailed = res.ok;
  }

  return NextResponse.json({ ok: true, emailed });
}
