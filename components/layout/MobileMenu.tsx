"use client";

import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-blue-dark/50 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        aria-label="Close navigation overlay"
      />
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[82vw] max-w-[300px] transform bg-blue-dark transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-light hover:bg-white/10 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <Sidebar mobile onNavigate={onClose} />
      </div>
    </div>
  );
}
