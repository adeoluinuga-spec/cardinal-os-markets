import type { ReactNode } from "react";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingNav from "@/components/marketing/MarketingNav";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white"><MarketingNav /><main>{children}</main><MarketingFooter /></div>;
}
