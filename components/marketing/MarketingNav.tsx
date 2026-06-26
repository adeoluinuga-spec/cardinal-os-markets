"use client";

import Link from "next/link";
import { Menu, Store, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/markets", label: "Markets" },
  { href: "/login", label: "Sign in" },
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Cardinal OS Markets home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-primary text-white shadow-sm"><Store size={18} strokeWidth={2.4} /></span>
      {!compact && <span className="leading-tight"><span className="block font-display text-[17px] font-bold text-blue-dark">Cardinal OS</span><span className="block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-blue-primary">Markets</span></span>}
    </Link>
  );
}

export default function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-blue-border/80 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <BrandMark />
        <div className="hidden items-center gap-8 md:flex">{links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-semibold text-ink2 transition hover:text-blue-primary">{link.label}</Link>)}</div>
        <div className="hidden md:block"><Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-blue-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-dark">Start Free Trial</Link></div>
        <button type="button" onClick={() => setIsOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg border border-blue-border text-blue-dark md:hidden" aria-label="Open navigation menu"><Menu size={21} /></button>
      </nav>
      {isOpen && <div className="fixed inset-0 z-[60] bg-blue-dark text-white md:hidden">
        <div className="flex h-[68px] items-center justify-between border-b border-white/15 px-5"><BrandMark compact /><button type="button" onClick={() => setIsOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg border border-white/20" aria-label="Close navigation menu"><X size={21} /></button></div>
        <div className="flex h-[calc(100vh-68px)] flex-col justify-between p-6"><div className="space-y-2">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="block rounded-xl px-4 py-4 font-display text-3xl font-bold transition hover:bg-white/10">{link.label}</Link>)}</div><Link href="/signup" onClick={() => setIsOpen(false)} className="inline-flex justify-center rounded-lg bg-white px-5 py-4 text-base font-bold text-blue-dark">Start Free Trial</Link></div>
      </div>}
    </header>
  );
}
