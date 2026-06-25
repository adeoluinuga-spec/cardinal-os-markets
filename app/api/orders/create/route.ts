import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getCurrentUserWithTenant,
} from "@/lib/serverAuth";

type OrderItemInput = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type CreateOrderBody = {
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  channel: string;
  items: OrderItemInput[];
  discount?: number;
  delivery_address?: string;
  expected_delivery_at?: string;
  notes?: string;
};

function buildOrderNumber(slug: string, year: number, sequence: number) {
  const prefix = slug.replace(/-/g, "").toUpperCase() || "TENANT";
  return `${prefix}${year}-${String(sequence).padStart(4, "0")}`;
}

export async function POST(request: Request) {
  const { tenant, user } = await getCurrentUserWithTenant();

  if (!tenant || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedTenant = Array.isArray(tenant) ? tenant[0] : tenant;
  const body = (await request.json()) as CreateOrderBody;

  if (!body.customer_id || !body.items?.length) {
    return NextResponse.json(
      { error: "Customer and at least one item are required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", normalizedTenant.id);
  const sequence = (count ?? 0) + 1;
  const year = new Date().getFullYear();
  const orderNumber = buildOrderNumber(normalizedTenant.slug, year, sequence);
  const subtotal = body.items.reduce(
    (total, item) => total + Number(item.quantity) * Number(item.unit_price),
    0,
  );
  const discount = Number(body.discount ?? 0);
  const total = Math.max(0, subtotal - discount);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      tenant_id: normalizedTenant.id,
      order_number: orderNumber,
      customer_id: body.customer_id,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone || null,
      channel: body.channel,
      status: "quote",
      payment_status: "unpaid",
      subtotal,
      discount,
      total,
      amount_paid: 0,
      balance: total,
      delivery_address: body.delivery_address || null,
      expected_delivery_at: body.expected_delivery_at || null,
      notes: body.notes || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  const orderItems = body.items.map((item) => ({
    tenant_id: normalizedTenant.id,
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    subtotal: Number(item.quantity) * Number(item.unit_price),
  }));
  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  await Promise.all(
    body.items.map(async (item) => {
      const { data: product } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("tenant_id", normalizedTenant.id)
        .eq("id", item.product_id)
        .single();
      const nextStock = Math.max(
        0,
        Number(product?.stock_quantity ?? 0) - Number(item.quantity),
      );
      await supabase
        .from("products")
        .update({ stock_quantity: nextStock })
        .eq("tenant_id", normalizedTenant.id)
        .eq("id", item.product_id);
    }),
  );

  const { data: customer } = await supabase
    .from("customers")
    .select("lifetime_value, total_orders")
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", body.customer_id)
    .single();
  await supabase
    .from("customers")
    .update({
      lifetime_value: Number(customer?.lifetime_value ?? 0) + total,
      total_orders: Number(customer?.total_orders ?? 0) + 1,
      last_order_at: new Date().toISOString(),
    })
    .eq("tenant_id", normalizedTenant.id)
    .eq("id", body.customer_id);

  return NextResponse.json({ order });
}
