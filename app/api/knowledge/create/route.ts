import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";
import { generateEmbedding } from "@/lib/embeddings";

const CATEGORIES = new Set([
  "products",
  "pricing",
  "processes",
  "policies",
  "suppliers",
  "other",
]);

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();
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
    .insert({
      tenant_id: t.id,
      title,
      content,
      category,
      embedding,
      created_by: user?.id ?? null,
    })
    .select("id, title, content, category, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ entry: data, embedded: embedding !== null });
}
