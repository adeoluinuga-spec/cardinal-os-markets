import Link from "next/link";

export const plans = [
  { name: "Starter", price: "₦50,000", note: "Best for small teams", features: ["Up to 3 staff", "Up to 200 customers", "Up to 100 orders/month", "Core modules included", "Email support"] },
  { name: "Growth", price: "₦100,000", note: "Best for growing businesses", featured: true, features: ["Up to 10 staff", "Up to 1,000 customers", "Unlimited orders", "Autopilot included", "SMS Broadcasts", "Performance Tracking", "WhatsApp support"] },
  { name: "Professional", price: "₦150,000", note: "For serious operations", features: ["Unlimited staff", "Unlimited everything", "Full Autopilot suite", "Activity Log", "Association Dashboard", "Priority support"] },
];

export default function PricingCards() {
  return <div className="grid gap-5 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`relative flex flex-col rounded-xl border p-6 ${plan.featured ? "border-blue-primary bg-blue-pale shadow-[0_18px_42px_rgba(26,74,139,0.14)]" : "border-blue-border bg-white"}`}>{plan.featured && <span className="absolute -top-3 left-6 rounded-full bg-blue-primary px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white">Most popular</span>}<p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-blue-primary">{plan.name}</p><p className="mt-3 font-display text-4xl font-bold text-ink">{plan.price}<span className="font-sans text-sm font-medium text-ink2">/month</span></p><p className="mt-2 text-sm text-ink2">{plan.note}</p><ul className="mt-6 flex-1 space-y-3 border-t border-blue-border pt-5 text-sm text-ink2">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className="font-bold text-green">✓</span>{feature}</li>)}</ul><Link href="/signup" className={`mt-7 inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-bold transition ${plan.featured ? "bg-blue-primary text-white hover:bg-blue-dark" : "border border-blue-primary text-blue-primary hover:bg-blue-light"}`}>Start Free Trial</Link></article>)}</div>;
}
