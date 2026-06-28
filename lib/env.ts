/**
 * Centralised environment-variable validation.
 *
 * `REQUIRED` vars are fatal — without them the app cannot serve a single
 * request, so we fail fast and loudly at boot (see instrumentation.ts).
 * `RECOMMENDED` vars gate individual features (billing, AI, email, SMS); a
 * missing one only degrades that feature, so we warn rather than crash.
 */

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const RECOMMENDED = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_WEBHOOK_SECRET",
  "PAYSTACK_PUBLIC_KEY",
  "RESEND_API_KEY",
  "TERMII_API_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_NAME",
] as const;

export type EnvCheckResult = {
  ok: boolean;
  missingRequired: string[];
  missingRecommended: string[];
};

type EnvSource = Record<string, string | undefined>;

/** Pure check — returns which vars are missing without throwing. Testable. */
export function checkEnv(source: EnvSource = process.env): EnvCheckResult {
  const isSet = (k: string) => {
    const v = source[k];
    return typeof v === "string" && v.trim().length > 0;
  };
  const missingRequired = REQUIRED.filter((k) => !isSet(k));
  const missingRecommended = RECOMMENDED.filter((k) => !isSet(k));
  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
  };
}

/**
 * Validate at startup. Throws (listing every missing required var at once) if
 * a required var is absent; logs a single warning for missing recommended
 * vars. Call this from instrumentation.register().
 */
export function assertEnv(source: EnvSource = process.env): void {
  const { ok, missingRequired, missingRecommended } = checkEnv(source);

  if (missingRecommended.length > 0) {
    console.warn(
      `[env] Missing recommended env vars (related features will be disabled): ${missingRecommended.join(
        ", ",
      )}`,
    );
  }

  if (!ok) {
    throw new Error(
      `[env] Missing required environment variables: ${missingRequired.join(
        ", ",
      )}. Set them in .env.local (see .env.example) before starting the app.`,
    );
  }
}
