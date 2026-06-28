import { describe, it, expect, beforeAll } from "vitest";

// The encryption key is derived from the service-role key, so it must exist
// before the module under test is imported.
beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key";
});

describe("tenant secret encryption", () => {
  it("round-trips a value through encrypt/decrypt", async () => {
    const { encryptTenantSecret, decryptTenantSecret } = await import(
      "./tenantPaystack"
    );
    const secret = "sk_test_abc123_paystack";
    const enc = encryptTenantSecret(secret);
    expect(enc).toBeTruthy();
    expect(enc).not.toBe(secret);
    expect(enc!.startsWith("aes256gcm:v1:")).toBe(true);
    expect(decryptTenantSecret(enc)).toBe(secret);
  });

  it("returns null for empty input", async () => {
    const { encryptTenantSecret } = await import("./tenantPaystack");
    expect(encryptTenantSecret("")).toBeNull();
    expect(encryptTenantSecret(null)).toBeNull();
    expect(encryptTenantSecret(undefined)).toBeNull();
  });

  it("passes through legacy unencrypted values on decrypt", async () => {
    const { decryptTenantSecret } = await import("./tenantPaystack");
    expect(decryptTenantSecret("plain_legacy_secret")).toBe(
      "plain_legacy_secret",
    );
  });
});
