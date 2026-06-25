import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getCurrentUserWithTenant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = Array.isArray(tenant) ? tenant[0] : tenant;
  const { conversation } = await request.json();
  let draft = {
    customer_name: "",
    customer_phone: "",
    items: [],
    delivery_address: "",
    delivery_date: null,
    confidence: "low",
    notes: "Claude is not configured, so extraction could not run.",
  };
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 700,
      system: `You are an order extraction AI for ${t.name}. Extract order details from this customer conversation. Return JSON only with this structure: {"customer_name":string,"customer_phone":string,"items":[{"product_name":string,"quantity":number,"notes":string}],"delivery_address":string,"delivery_date":string|null,"confidence":"high"|"medium"|"low","notes":string}`,
      messages: [{ role: "user", content: conversation }],
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    draft = JSON.parse(text.replace(/```json|```/g, "").trim());
  }
  return NextResponse.json({ draft });
}
