import { createHash } from "crypto";

export function getDeliverySecret() {
  return (
    process.env.DELIVERY_LINK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "cardinal-os-markets-dev-secret"
  );
}

export function createDeliveryKey(deliveryId: string) {
  return createHash("sha256")
    .update(`${deliveryId}:${getDeliverySecret()}`)
    .digest("hex");
}

export function isValidDeliveryKey(deliveryId: string, key: string | null) {
  if (!key) {
    return false;
  }

  return createDeliveryKey(deliveryId) === key;
}
