import { NextResponse } from "next/server";
import { createDeliveryKey } from "@/lib/deliverySecurity";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendTermiiSms(to: string | null, message: string) {
  if (!to || !process.env.TERMII_API_KEY) {
    return;
  }

  await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TERMII_API_KEY,
      to,
      from: "CardinalOS",
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  }).catch(() => null);
}

export async function POST(request: Request) {
  const { tenant } = await getCurrentUserWithTenant();

  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as {
    order_id?: string;
    rider_name?: string;
    rider_phone?: string;
    estimated_delivery_date?: string;
  };

  if (!body.order_id || !body.rider_name || !body.rider_phone) {
    return NextResponse.json(
      { error: "Order, rider name, and rider phone are required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", body.order_id)
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 404 });
  }

  const otp = generateOtp();
  const { data: delivery, error } = await supabase
    .from("deliveries")
    .insert({
      tenant_id: normalizedTenant.id,
      order_id: body.order_id,
      rider_name: body.rider_name,
      rider_phone: body.rider_phone,
      otp_code: otp,
      status: "assigned",
      dispatched_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .from("orders")
    .update({
      status: "dispatched",
      expected_delivery_at: body.estimated_delivery_date || order.expected_delivery_at,
    })
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", body.order_id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const trackingUrl = `${appUrl}/track/${order.tracking_token}`;
  await sendTermiiSms(
    order.customer_phone,
    `Your ${normalizedTenant.name} order ${order.order_number} is on the way. Confirm delivery with code: ${otp}. Do not share this code with anyone except when confirming receipt.`,
  );
  await sendTermiiSms(order.customer_phone, `Track your order: ${trackingUrl}`);

  return NextResponse.json({
    delivery,
    rider_url: `${appUrl}/rider/${delivery.id}?key=${createDeliveryKey(delivery.id)}`,
  });
}
