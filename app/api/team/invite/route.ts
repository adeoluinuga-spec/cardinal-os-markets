import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const allowedRoles = new Set(["sales_agent", "warehouse", "finance", "rider"]);

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    tenantId?: string;
    email?: string;
    role?: string;
    invitedBy?: string;
    businessName?: string;
  };

  if (!body.tenantId || !body.email || !body.role || !body.invitedBy) {
    return NextResponse.json(
      { error: "Missing invite details." },
      { status: 400 },
    );
  }

  if (!allowedRoles.has(body.role)) {
    return NextResponse.json({ error: "Invalid invite role." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(body.email, {
      redirectTo: `${appUrl}/login`,
      data: {
        tenant_id: body.tenantId,
        role: body.role,
      },
    });

  if (inviteError || !inviteData.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Unable to create invite user." },
      { status: 400 },
    );
  }

  const { error: tenantUserError } = await supabaseAdmin
    .from("tenant_users")
    .upsert(
      {
        tenant_id: body.tenantId,
        user_id: inviteData.user.id,
        role: body.role,
        full_name: body.email,
        invited_by: body.invitedBy,
        is_active: true,
      },
      {
        onConflict: "tenant_id,user_id",
      },
    );

  if (tenantUserError) {
    return NextResponse.json(
      { error: tenantUserError.message },
      { status: 400 },
    );
  }

  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cardinal OS Markets <onboarding@markets.cardinal.stuartdavidson.org>",
        to: body.email,
        subject: `You're invited to ${body.businessName ?? "Cardinal OS Markets"}`,
        html: `
          <p>You have been invited to join ${body.businessName ?? "a Cardinal OS Markets workspace"} as ${roleLabel(body.role)}.</p>
          <p>Open Cardinal OS Markets to accept your invitation.</p>
        `,
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
