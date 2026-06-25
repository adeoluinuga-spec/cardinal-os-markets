import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

export async function GET() {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, bank_name, account_number, account_name, is_primary, is_active, created_at")
    .eq("tenant_id", t.id)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role || !["owner", "admin", "finance"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    is_primary?: boolean;
  };

  const bankName = body.bank_name?.trim();
  const accountNumber = body.account_number?.trim();
  const accountName = body.account_name?.trim();
  if (!bankName || !accountNumber || !accountName) {
    return NextResponse.json(
      { error: "Bank name, account number and account name are required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();

  // First account is always primary; otherwise honour the toggle.
  const { count } = await supabase
    .from("bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", t.id)
    .eq("is_active", true);
  const makePrimary = body.is_primary === true || (count ?? 0) === 0;

  if (makePrimary) {
    await supabase
      .from("bank_accounts")
      .update({ is_primary: false })
      .eq("tenant_id", t.id);
  }

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      tenant_id: t.id,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      is_primary: makePrimary,
    })
    .select("id, bank_name, account_number, account_name, is_primary, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ account: data });
}
