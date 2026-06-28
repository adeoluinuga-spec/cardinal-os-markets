import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

const MAX_IMAGES = 3;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName;
  }
  return file.type.split("/")[1] || "jpg";
}

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const formData = await request.formData();
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File)
    .slice(0, MAX_IMAGES);

  if (!files.length) {
    return NextResponse.json({ error: "No image files uploaded." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const urls: string[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP, or GIF images are allowed." },
        { status: 400 },
      );
    }

    const ext = extensionFor(file);
    const path = `tenants/${normalizedTenant.id}/products/${Date.now()}-${index}.${ext}`;
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
    urls.push(data.publicUrl);
  }

  return NextResponse.json({ urls });
}
