import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";
import { generateEmbedding } from "@/lib/embeddings";
import { getBrainLiveContext } from "@/lib/aiContext";
import { aiQuotaResponse, recordAiQuery } from "@/lib/aiUsage";

const MODEL = "claude-sonnet-4-6";

type KnowledgeMatch = {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
};

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { question, session_id } = (await request.json()) as {
    question?: string;
    session_id?: string;
  };
  const query = (question ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Enforce the monthly AI query limit.
  const quota = await aiQuotaResponse(supabase, t);
  if (quota) {
    return quota;
  }

  // 1. Retrieve the most relevant knowledge entries via vector similarity,
  //    falling back to recent entries when embeddings are unavailable.
  const embedding = await generateEmbedding(query);
  let matches: KnowledgeMatch[] = [];
  if (embedding) {
    const { data } = await supabase.rpc("match_knowledge_base", {
      query_embedding: embedding,
      p_tenant_id: t.id,
      match_count: 5,
    });
    matches = (data ?? []) as KnowledgeMatch[];
  } else {
    const { data } = await supabase
      .from("knowledge_base")
      .select("id, title, content, category")
      .eq("tenant_id", t.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);
    matches = ((data ?? []) as Omit<KnowledgeMatch, "similarity">[]).map((m) => ({
      ...m,
      similarity: 0,
    }));
  }

  // 2. Live business data for grounding.
  const liveContext = await getBrainLiveContext(supabase, t.id);

  const knowledgeBlock = matches.length
    ? matches
        .map(
          (m, i) =>
            `[${i + 1}] ${m.title} (${m.category})\n${m.content}`,
        )
        .join("\n\n")
    : "The knowledge base is empty.";

  // 3. Ask Claude.
  let answer = matches.length
    ? `Based on "${matches[0].title}": ${matches[0].content}`
    : "I couldn't find a matching knowledge entry for that question.";
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const system = `You are the Company Brain for ${t.name}, a ${t.business_type ?? "trading"} business in ${t.city ?? "Lagos"}. Answer questions using the knowledge base below. Be specific and accurate. If the answer is not in the knowledge base, say so clearly.

KNOWLEDGE BASE:
${knowledgeBlock}

LIVE BUSINESS DATA:
${liveContext}`;

      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: query }],
      });
      const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("")
        .trim();
      if (text) answer = text;
    } catch {
      // Keep the deterministic knowledge-base answer when Claude is unavailable.
    }
  }

  // 4. Persist the exchange and count usage.
  const session = session_id || crypto.randomUUID();
  await supabase.from("ai_conversations").insert([
    {
      tenant_id: t.id,
      user_id: user?.id ?? null,
      session_id: session,
      role: "user",
      content: query,
    },
    {
      tenant_id: t.id,
      user_id: user?.id ?? null,
      session_id: session,
      role: "assistant",
      content: answer,
    },
  ]);
  await recordAiQuery(supabase, t.id);

  return NextResponse.json({
    answer,
    session_id: session,
    sources: matches.map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      similarity: m.similarity,
    })),
  });
}
