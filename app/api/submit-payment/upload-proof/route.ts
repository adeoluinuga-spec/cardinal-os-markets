import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "pdf"].includes(fromName)) {
    return fromName;
  }
  return file.type === "application/pdf" ? "pdf" : "jpg";
}

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();

  if (!tenant || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const formData = await request.formData();
  const file = formData.get("proof");
  const orderId = String(formData.get("order_id") ?? "unassigned");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a proof file." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Proof must be JPG, PNG, WEBP, or PDF." },
      { status: 400 },
    );
  }

  const timestamp = Date.now();
  const hash = createHash("sha256")
    .update(`${file.name}:${file.size}:${timestamp}:${orderId}:${user.id}`)
    .digest("hex");
  const ext = extensionFor(file);
  const path = `tenants/${normalizedTenant.id}/payment-proofs/${orderId}/${hash}.${ext}`;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.storage
    .from("tenant-assets")
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
  return NextResponse.json({ proof_url: data.publicUrl, proof_hash: hash });
}
