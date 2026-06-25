"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  business_type: string | null;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string | null;
  market_association: string | null;
  ai_persona_name: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  onboarding_completed: boolean | null;
  onboarding_step: number | null;
  created_at: string | null;
};

type TenantUser = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  full_name: string;
  phone: string | null;
  is_active: boolean | null;
  invited_by: string | null;
  created_at: string | null;
  tenant?: Tenant | null;
};

type TenantContextValue = {
  tenant: Tenant | null;
  tenantUser: TenantUser | null;
  role: string | null;
  isLoading: boolean;
  refetchTenant: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetchTenant = useCallback(async () => {
    if (!user) {
      setTenant(null);
      setTenantUser(null);
      setRole(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("tenant_users")
      .select("*, tenant:tenants(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      setTenant(null);
      setTenantUser(null);
      setRole(null);
      setIsLoading(false);
      router.replace("/onboarding");
      return;
    }

    setTenant((data.tenant as Tenant | null) ?? null);
    setTenantUser(data as TenantUser);
    setRole(data.role ?? null);
    setIsLoading(false);
  }, [router, user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void refetchTenant();
  }, [isAuthLoading, refetchTenant]);

  const value = useMemo(
    () => ({
      tenant,
      tenantUser,
      role,
      isLoading: isAuthLoading || isLoading,
      refetchTenant,
    }),
    [isAuthLoading, isLoading, refetchTenant, role, tenant, tenantUser],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }

  return context;
}
