import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = { params: { slug: string } };

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default async function AssociationPage({ params }: PageProps) {
  const { data: association } = await supabaseAdmin
    .from("associations")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

  if (!association) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-ink">
        Association not found.
      </main>
    );
  }

  const { data: members, count } = await supabaseAdmin
    .from("association_members")
    .select("tenant_id", { count: "exact" })
    .eq("association_id", association.id);

  const tenantIds = (members ?? []).map((member) => member.tenant_id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let gmv = 0;
  if (association.show_public_stats && tenantIds.length > 0) {
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("total")
      .in("tenant_id", tenantIds)
      .gte("created_at", monthStart.toISOString());
    gmv = (orders ?? []).reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  }

  const features = [
    "Manage orders from WhatsApp, Instagram, and your shop - all in one place",
    "Anti-fraud payment verification - the same receipt can never confirm two orders",
    "OTP delivery confirmation - proof every order arrived",
  ];

  return (
    <main className="min-h-screen bg-blue-pale px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <section className="text-center">
          {association.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={association.logo_url} alt={association.name} className="mx-auto h-16 w-16 rounded-full object-cover" />
          ) : null}
          <h1 className="mt-4 font-display text-4xl font-bold text-ink md:text-5xl">
            {association.name}
          </h1>
          <p className="mt-3 text-lg font-semibold text-blue-primary">
            {association.market_name} · {association.city}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-ink2">
            {count ?? 0} businesses in {association.market_name ?? association.name} trust Cardinal OS Markets.
          </p>
          {association.show_public_stats ? (
            <p className="mt-5 font-display text-3xl font-bold text-green">
              {money(gmv)} processed this month
            </p>
          ) : null}
          <Link
            href={`/signup?association=${association.slug}`}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-blue-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-dark"
          >
            Join {association.name} on Cardinal OS
          </Link>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-ink2">
            As a member of {association.name}, you get access to the full platform.
            Sign up today - 14-day free trial, no credit card required.
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature}>
              <CheckCircle2 className="h-6 w-6 text-green" />
              <p className="mt-4 text-sm font-semibold leading-6 text-ink">{feature}</p>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
