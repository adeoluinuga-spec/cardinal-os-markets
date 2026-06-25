import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant, role } = await getCurrentUserWithTenant();
  if (!tenant || !["owner", "admin"].includes(role ?? "")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const data = await request.json();
  let brief = "Performance is available. Review top order value, payment verification, and task completion to identify coaching opportunities.";
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest", max_tokens: 180,
      messages: [{ role: "user", content: `Write a 3-sentence HR brief for ${t.name}. Highlight strong performers and concerns from this JSON: ${JSON.stringify(data)}` }],
    });
    brief = msg.content.filter((b) => b.type === "text").map((b) => b.text).join(" ");
  }
  return NextResponse.json({ brief });
}
