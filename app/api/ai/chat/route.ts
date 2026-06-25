import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";
import { getAssistantLiveContext } from "@/lib/aiContext";
import { aiQuotaResponse, recordAiQuery } from "@/lib/aiUsage";

const MODEL = "claude-sonnet-4-6";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { message, history, session_id } = (await request.json()) as {
    message?: string;
    history?: ChatMessage[];
    session_id?: string;
  };
  const userMessage = (message ?? "").trim();
  if (!userMessage) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const quota = await aiQuotaResponse(supabase, t);
  if (quota) {
    return quota;
  }

  const liveContext = await getAssistantLiveContext(supabase, t.id);
  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let answer =
    "Claude is not configured (missing ANTHROPIC_API_KEY), so I can't answer right now.";
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const system = `You are the AI business assistant for ${t.name}, a ${t.business_type ?? "trading"} business in ${t.city ?? "Lagos"}, Nigeria.

LIVE BUSINESS DATA (as of today ${today}):
${liveContext}

You can help with:
- Business analysis and insights
- Drafting customer messages and follow-ups
- Answering operational questions
- Identifying patterns in the business
- Production/stock planning advice

Be direct, specific, and use the actual data above in your answers.`;

    const priorMessages = (history ?? [])
      .filter((m) => m.content?.trim())
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [...priorMessages, { role: "user", content: userMessage }],
    });
    answer = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
  }

  const session = session_id || crypto.randomUUID();
  await supabase.from("ai_conversations").insert([
    {
      tenant_id: t.id,
      user_id: user?.id ?? null,
      session_id: session,
      role: "user",
      content: userMessage,
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

  return NextResponse.json({ answer, session_id: session });
}
