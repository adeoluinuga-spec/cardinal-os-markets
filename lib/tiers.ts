export type SubscriptionTier =
  | "trial"
  | "starter"
  | "growth"
  | "professional";

export interface TierLimits {
  // Hard limits (-1 = unlimited)
  max_staff: number;
  max_customers: number;
  max_products: number;
  max_orders_per_month: number;
  max_knowledge_entries: number;
  max_ai_queries_per_month: number;

  // Feature flags
  features: {
    tasks: boolean;
    autopilot_inbox: boolean;
    autopilot_actions: boolean;
    autopilot_promise: boolean;
    performance_tracking: boolean;
    activity_log: boolean;
    sms_broadcasts: boolean;
    reps_view: boolean;
    approvals: boolean;
    incoming_stock: boolean;
    store_pickup: boolean;
    association_dashboard: boolean;
    woocommerce: boolean;
  };
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  trial: {
    max_staff: -1,
    max_customers: -1,
    max_products: -1,
    max_orders_per_month: -1,
    max_knowledge_entries: -1,
    max_ai_queries_per_month: -1,
    features: {
      tasks: true,
      autopilot_inbox: true,
      autopilot_actions: true,
      autopilot_promise: true,
      performance_tracking: true,
      activity_log: true,
      sms_broadcasts: true,
      reps_view: true,
      approvals: true,
      incoming_stock: true,
      store_pickup: true,
      association_dashboard: true,
      woocommerce: false,
    },
  },
  starter: {
    max_staff: 3,
    max_customers: 200,
    max_products: 50,
    max_orders_per_month: 100,
    max_knowledge_entries: 20,
    max_ai_queries_per_month: 50,
    features: {
      tasks: false,
      autopilot_inbox: false,
      autopilot_actions: false,
      autopilot_promise: false,
      performance_tracking: false,
      activity_log: false,
      sms_broadcasts: false,
      reps_view: false,
      approvals: false,
      incoming_stock: true,
      store_pickup: true,
      association_dashboard: false,
      woocommerce: false,
    },
  },
  growth: {
    max_staff: 10,
    max_customers: 1000,
    max_products: 200,
    max_orders_per_month: -1,
    max_knowledge_entries: 100,
    max_ai_queries_per_month: -1,
    features: {
      tasks: true,
      autopilot_inbox: true,
      autopilot_actions: true,
      autopilot_promise: false,
      performance_tracking: true,
      activity_log: false,
      sms_broadcasts: true,
      reps_view: true,
      approvals: true,
      incoming_stock: true,
      store_pickup: true,
      association_dashboard: false,
      woocommerce: false,
    },
  },
  professional: {
    max_staff: -1,
    max_customers: -1,
    max_products: -1,
    max_orders_per_month: -1,
    max_knowledge_entries: -1,
    max_ai_queries_per_month: -1,
    features: {
      tasks: true,
      autopilot_inbox: true,
      autopilot_actions: true,
      autopilot_promise: true,
      performance_tracking: true,
      activity_log: true,
      sms_broadcasts: true,
      reps_view: true,
      approvals: true,
      incoming_stock: true,
      store_pickup: true,
      association_dashboard: true,
      woocommerce: false,
    },
  },
};

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS["starter"];
}

export function hasFeature(
  tier: SubscriptionTier,
  feature: keyof TierLimits["features"],
): boolean {
  return TIER_LIMITS[tier]?.features[feature] ?? false;
}

export function isAtLimit(
  tier: SubscriptionTier,
  limitKey: keyof Omit<TierLimits, "features">,
  currentCount: number,
): boolean {
  const limit = TIER_LIMITS[tier]?.[limitKey] as number;
  if (limit === -1) return false;
  return currentCount >= limit;
}

export const TIER_NAMES: Record<SubscriptionTier, string> = {
  trial: "Free Trial",
  starter: "Starter",
  growth: "Growth",
  professional: "Professional",
};

export const TIER_PRICES: Record<SubscriptionTier, number> = {
  trial: 0,
  starter: 50000,
  growth: 100000,
  professional: 150000,
};

/** Human-readable labels for each feature flag, used by upgrade prompts. */
export const FEATURE_LABELS: Record<keyof TierLimits["features"], string> = {
  tasks: "Tasks",
  autopilot_inbox: "Autopilot",
  autopilot_actions: "Autopilot actions",
  autopilot_promise: "Autopilot promises",
  performance_tracking: "Performance tracking",
  activity_log: "Activity log",
  sms_broadcasts: "SMS broadcasts",
  reps_view: "Reps view",
  approvals: "Approvals",
  incoming_stock: "Incoming stock",
  store_pickup: "Store pickup",
  association_dashboard: "Association dashboard",
  woocommerce: "WooCommerce sync",
};

/**
 * The lowest paid tier (growth or professional) that unlocks a given feature.
 * Used by upgrade prompts to tell the user which plan to move to. Defaults to
 * "professional" if no paid tier includes the feature.
 */
export function minimumTierForFeature(
  feature: keyof TierLimits["features"],
): "growth" | "professional" {
  if (TIER_LIMITS.growth.features[feature]) return "growth";
  return "professional";
}

/**
 * Normalises an arbitrary tenant.subscription_tier string (which is typed as
 * `string | null` in the DB) into a known SubscriptionTier. Falls back to
 * "starter" so an unknown/missing tier defaults to the most-restrictive paid
 * limits rather than crashing.
 */
export function normalizeTier(tier: string | null | undefined): SubscriptionTier {
  if (tier && tier in TIER_LIMITS) {
    return tier as SubscriptionTier;
  }
  return "starter";
}
