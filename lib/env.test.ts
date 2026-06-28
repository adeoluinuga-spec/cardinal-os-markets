import { describe, it, expect } from "vitest";
import { checkEnv } from "./env";

const FULL = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  ANTHROPIC_API_KEY: "a",
  OPENAI_API_KEY: "o",
  PAYSTACK_SECRET_KEY: "p",
  PAYSTACK_WEBHOOK_SECRET: "pw",
  PAYSTACK_PUBLIC_KEY: "pp",
  RESEND_API_KEY: "r",
  TERMII_API_KEY: "t",
  NEXT_PUBLIC_APP_URL: "https://app",
  NEXT_PUBLIC_APP_NAME: "App",
};

describe("checkEnv", () => {
  it("passes when everything is set", () => {
    const r = checkEnv(FULL);
    expect(r.ok).toBe(true);
    expect(r.missingRequired).toHaveLength(0);
    expect(r.missingRecommended).toHaveLength(0);
  });

  it("flags missing required vars and is not ok", () => {
    const r = checkEnv({ ...FULL, SUPABASE_SERVICE_ROLE_KEY: "" });
    expect(r.ok).toBe(false);
    expect(r.missingRequired).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("flags missing recommended vars but stays ok", () => {
    const r = checkEnv({ ...FULL, RESEND_API_KEY: undefined });
    expect(r.ok).toBe(true);
    expect(r.missingRecommended).toContain("RESEND_API_KEY");
  });

  it("treats whitespace-only values as missing", () => {
    const r = checkEnv({ ...FULL, NEXT_PUBLIC_SUPABASE_URL: "   " });
    expect(r.ok).toBe(false);
    expect(r.missingRequired).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });
});
