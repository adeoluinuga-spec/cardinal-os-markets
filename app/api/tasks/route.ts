import { NextResponse } from "next/server";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function GET(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const status = new URL(request.url).searchParams.get("status");
  const supabase = await createServerSupabaseClient();
  let q = supabase.from("tasks").select("*").eq("tenant_id", t.id).order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: users } = await supabase.from("tenant_users").select("user_id, full_name, role").eq("tenant_id", t.id).eq("is_active", true);
  return NextResponse.json({ tasks: data ?? [], users: users ?? [] });
}

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = await request.json();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("tasks").insert({
    tenant_id: t.id,
    title: body.title,
    description: body.description || null,
    priority: body.priority || "medium",
    assigned_to: body.assigned_to || null,
    created_by: user.id,
    due_date: body.due_date || null,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ task: data });
}

export async function PATCH(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = await request.json();
  const update: Record<string, unknown> = { status: body.status };
  if (body.status === "complete") update.completed_at = new Date().toISOString();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("tasks").update(update).eq("tenant_id", t.id).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
