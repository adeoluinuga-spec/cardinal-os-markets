"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import { TenantProvider, useTenant } from "@/context/TenantContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

function getTrialDaysLeft(trialEndsAt: string | null | undefined) {
  if (!trialEndsAt) return 0;
  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / 86_400_000));
}

function TrialBanner({
  trialEndsAt,
}: {
  trialEndsAt: string | null | undefined;
}) {
  const daysLeft = getTrialDaysLeft(trialEndsAt);
  const urgent = daysLeft <= 3;

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-40 flex h-10 items-center justify-center gap-2 px-3 text-center text-xs font-semibold text-white md:left-[240px] ${
        urgent ? "bg-red-700" : "bg-gold"
      }`}
    >
      <span>Trial ends in {daysLeft} day{daysLeft === 1 ? "" : "s"}</span>
      <span aria-hidden="true">·</span>
      <Link href="/upgrade" className="underline underline-offset-2">
        Upgrade Now →
      </Link>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, tenant, isLoading } = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasTrialBanner = tenant?.subscription_status === "trial";

  useEffect(() => {
    if (!isLoading && role === "rider" && pathname !== "/app/rider") {
      router.replace("/app/rider");
    }
  }, [isLoading, pathname, role, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-pale">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white text-ink">
      <Sidebar />
      {hasTrialBanner ? <TrialBanner trialEndsAt={tenant.trial_ends_at} /> : null}
      <TopBar
        onMenuClick={() => setIsMobileMenuOpen(true)}
        hasTrialBanner={hasTrialBanner}
      />
      <MobileMenu
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main
        className={`animate-page-in min-h-screen overflow-x-hidden px-3 pb-8 sm:px-4 md:pl-[272px] md:pr-8 ${
          hasTrialBanner ? "pt-[7.5rem]" : "pt-20"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <AppShell>{children}</AppShell>
      </TenantProvider>
    </AuthProvider>
  );
}
