import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: { token: string } };

export async function POST(request: Request, { params }: RouteContext) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, tenant_id")
    .eq("tracking_token", params.token)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Proof image is required." }, { status: 400 });
  }

  const extension = file.name.split(".").pop() || "jpg";
  const path = `tenants/${order.tenant_id}/payments/public-${order.id}-${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from("tenant-assets")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data } = supabaseAdmin.storage.from("tenant-assets").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, fileName: file.name });
}
