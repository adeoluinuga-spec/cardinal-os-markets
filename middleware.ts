import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const publicRoutes = [
  "/login",
  "/signup",
  "/upgrade",
  "/pay",
  "/track",
  "/rider",
  "/association",
  "/api/webhooks",
];

function isPublicRoute(pathname: string) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response = NextResponse.next({
            request,
          });
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/app") || pathname === "/onboarding") {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant:tenants(subscription_status, trial_ends_at, onboarding_completed)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (pathname.startsWith("/app") && !tenantUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("inactive", "1");
      return NextResponse.redirect(url);
    }

    const tenant = Array.isArray(tenantUser?.tenant)
      ? tenantUser?.tenant[0]
      : tenantUser?.tenant;

    if (
      pathname.startsWith("/app") &&
      tenant &&
      tenant.onboarding_completed !== true
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    const trialEndsAt = tenant?.trial_ends_at
      ? new Date(tenant.trial_ends_at)
      : null;
    const isExpiredTrial =
      tenant?.subscription_status === "trial" &&
      trialEndsAt !== null &&
      trialEndsAt.getTime() < Date.now();
    const isBlockedSubscription =
      tenant?.subscription_status === "suspended" ||
      tenant?.subscription_status === "cancelled";

    if (pathname.startsWith("/app") && (isExpiredTrial || isBlockedSubscription)) {
      const url = request.nextUrl.clone();
      url.pathname = "/upgrade";
      return NextResponse.redirect(url);
    }
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!tenantUser) {
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/app/dashboard";
    return NextResponse.redirect(url);
  }

  if (isPublicRoute(pathname)) {
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
