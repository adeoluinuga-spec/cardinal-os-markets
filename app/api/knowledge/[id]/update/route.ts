import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";
import { generateEmbedding } from "@/lib/embeddings";

type RouteContext = { params: { id: string } };

const CATEGORIES = new Set([
  "products",
  "pricing",
  "processes",
  "policies",
  "suppliers",
  "other",
]);

export async function PATCH(request: Request, { params }: RouteContext) {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as {
    title?: string;
    category?: string;
    content?: string;
  };

  const title = body.title?.trim();
  const content = body.content?.trim();
  const category = CATEGORIES.has(body.category ?? "")
    ? (body.category as string)
    : "other";

  if (!title || !content) {
    return NextResponse.json(
      { error: "Title and content are required." },
      { status: 400 },
    );
  }

  const embedding = await generateEmbedding(`${title}\n\n${content}`);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_base")
    .update({
      title,
      content,
      category,
      embedding,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", t.id)
    .eq("id", params.id)
    .select("id, title, content, category, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ entry: data, embedded: embedding !== null });
}
