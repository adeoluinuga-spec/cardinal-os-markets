import crypto from "crypto";

const PREFIX = "aes256gcm:v1";

function encryptionKey() {
  const source = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!source) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for tenant Paystack encryption.");
  }
  return crypto.createHash("sha256").update(source).digest();
}

export function encryptTenantSecret(value: string | null | undefined) {
  const plain = value?.trim();
  if (!plain) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptTenantSecret(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith(`${PREFIX}:`)) {
    return value;
  }

  const [, , ivPart, tagPart, encryptedPart] = value.split(":");
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Invalid encrypted tenant secret format.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
