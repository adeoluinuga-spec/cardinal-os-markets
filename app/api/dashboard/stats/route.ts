import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboardData";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function GET() {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const supabase = await createServerSupabaseClient();
  const data = await getDashboardData(supabase, normalizedTenant.id);

  return NextResponse.json(data);
}
