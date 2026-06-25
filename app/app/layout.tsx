"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import { TenantProvider, useTenant } from "@/context/TenantContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Spinner } from "@/components/ui/Spinner";

function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, isLoading } = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-blue-pale text-ink">
      <Sidebar />
      <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />
      <MobileMenu
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main className="min-h-screen px-4 pb-8 pt-20 md:pl-[264px] md:pr-6">
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
