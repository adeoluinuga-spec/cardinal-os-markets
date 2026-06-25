import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  const body = (await request.json()) as {
    amount?: number;
    channel?: string;
    reference?: string;
    bank_name?: string;
    proof_url?: string | null;
    proof_file_name?: string | null;
    tracking_token?: string;
  };

  if (!body.amount || !body.reference || !body.channel) {
    return NextResponse.json(
      { error: "Amount, channel, and reference are required." },
      { status: 400 },
    );
  }

  const { tenant, user } = await getCurrentUserWithTenant();
  const supabase = tenant ? await createServerSupabaseClient() : supabaseAdmin;
  let tenantId = Array.isArray(tenant) ? tenant[0]?.id : tenant?.id;

  if (!tenantId) {
    if (!body.tracking_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: publicOrder } = await supabaseAdmin
      .from("orders")
      .select("id, tenant_id")
      .eq("id", params.id)
      .eq("tracking_token", body.tracking_token)
      .maybeSingle();

    if (!publicOrder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    tenantId = publicOrder.tenant_id;
  }

  const { data: duplicate } = await supabase
    .from("payments")
    .select("order:orders(order_number)")
    .eq("tenant_id", tenantId)
    .eq("reference", body.reference)
    .maybeSingle();

  if (duplicate) {
    const joinedOrder = duplicate.order as
      | { order_number?: string }
      | { order_number?: string }[]
      | null;
    const orderNumber = Array.isArray(joinedOrder)
      ? joinedOrder[0]?.order_number
      : joinedOrder?.order_number;
    return NextResponse.json(
      { error: `This reference was already used for order ${orderNumber ?? "another order"}` },
      { status: 400 },
    );
  }

  const timestamp = new Date().toISOString();
  const proofHash = createHash("sha256")
    .update(`${body.proof_file_name ?? "no-file"}-${body.amount}-${timestamp}`)
    .digest("hex");

  const { data, error } = await supabase
    .from("payments")
    .insert({
      tenant_id: tenantId,
      order_id: params.id,
      reference: body.reference,
      amount: Number(body.amount),
      channel: body.channel,
      bank_name: body.bank_name ?? null,
      proof_url: body.proof_url ?? null,
      proof_hash: proofHash,
      status: "pending",
      submitted_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    payment: data,
    message: "Payment submitted. Awaiting Finance verification.",
  });
}
