import { NextResponse } from "next/server";
import { isValidDeliveryKey } from "@/lib/deliverySecurity";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const deliveryId = String(formData.get("delivery_id") ?? "");
  const otp = String(formData.get("otp") ?? "");
  const key = formData.get("key") ? String(formData.get("key")) : null;
  const proof = formData.get("proof");

  if (!deliveryId || !otp) {
    return NextResponse.json(
      { error: "Delivery and OTP are required." },
      { status: 400 },
    );
  }

  if (key && !isValidDeliveryKey(deliveryId, key)) {
    return NextResponse.json(
      { error: "Invalid or expired link." },
      { status: 403 },
    );
  }

  const { data: delivery, error } = await supabaseAdmin
    .from("deliveries")
    .select("*, order:orders(id, tenant_id, customer_id)")
    .eq("id", deliveryId)
    .single();

  if (error) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  if (Number(delivery.otp_attempts ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Too many wrong attempts. Contact dispatch." },
      { status: 423 },
    );
  }

  if (delivery.otp_code !== otp) {
    const attempts = Number(delivery.otp_attempts ?? 0) + 1;
    await supabaseAdmin
      .from("deliveries")
      .update({ otp_attempts: attempts })
      .eq("id", deliveryId);
    const remaining = Math.max(0, 3 - attempts);
    return NextResponse.json(
      { error: `Wrong code. ${remaining} attempts remaining.`, attempts },
      { status: 400 },
    );
  }

  let proofUrl: string | null = null;

  if (proof instanceof File) {
    const extension = proof.name.split(".").pop() || "jpg";
    const path = `tenants/${delivery.order.tenant_id}/deliveries/${deliveryId}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("tenant-assets")
      .upload(path, proof, { upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    proofUrl = supabaseAdmin.storage.from("tenant-assets").getPublicUrl(path).data
      .publicUrl;
  }

  const deliveredAt = new Date().toISOString();
  await supabaseAdmin
    .from("deliveries")
    .update({
      otp_verified: true,
      proof_photo_url: proofUrl,
      status: "delivered",
      delivered_at: deliveredAt,
    })
    .eq("id", deliveryId);
  await supabaseAdmin
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", delivery.order_id);

  if (delivery.order.customer_id) {
    await supabaseAdmin
      .from("customers")
      .update({ last_order_at: deliveredAt })
      .eq("id", delivery.order.customer_id);
  }

  return NextResponse.json({ ok: true, delivered_at: deliveredAt, proof_url: proofUrl });
}
