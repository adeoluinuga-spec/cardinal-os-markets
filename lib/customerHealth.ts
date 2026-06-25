export type CustomerHealthInput = {
  last_order_at: string | null;
  total_orders: number | null;
  lifetime_value: number | null;
};

export function daysSince(value: string | null) {
  if (!value) {
    return null;
  }

  const elapsed = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(elapsed / 86_400_000));
}

export function calculateCustomerHealth(customer: CustomerHealthInput) {
  let score = 50;
  const days = daysSince(customer.last_order_at);

  if (days !== null && days < 30) {
    score += 20;
  } else if (days !== null && days <= 60) {
    score += 0;
  } else if (days !== null && days <= 90) {
    score -= 15;
  } else {
    score -= 25;
  }

  if (Number(customer.total_orders ?? 0) >= 3) {
    score += 15;
  }

  if (Number(customer.lifetime_value ?? 0) > 500_000) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}
