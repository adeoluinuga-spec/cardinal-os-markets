import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Proof file is required." }, { status: 400 });
  }

  const extension = file.name.split(".").pop() || "jpg";
  const path = `tenants/${normalizedTenant.id}/payments/${crypto.randomUUID()}.${extension}`;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.storage
    .from("tenant-assets")
    .upload(path, file, { upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);

  return NextResponse.json({
    url: data.publicUrl,
    path,
    fileName: file.name,
  });
}
