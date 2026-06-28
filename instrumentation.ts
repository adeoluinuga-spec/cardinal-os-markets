/**
 * Next.js startup hook. Runs once when the server boots (Node.js runtime).
 * We validate environment configuration here so misconfiguration fails fast
 * and visibly, instead of surfacing as a confusing runtime error inside a
 * single API route later.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("./lib/env");
    assertEnv();
  }
}
