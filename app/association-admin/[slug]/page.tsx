import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createServerSupabaseClient, getCurrentUserWithTenant } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = { params: { slug: string } };

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function csvEscape(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default async function AssociationAdminPage({ params }: PageProps) {
  const { user } = await getCurrentUserWithTenant();
  if (!user) redirect(`/login?next=/association-admin/${params.slug}`);

  const { data: association } = await supabaseAdmin
    .from("associations")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!association) {
    return <main className="p-8 text-ink">Association not found.</main>;
  }

  const supabase = await createServerSupabaseClient();
  const { data: admin } = await supabase
    .from("association_admins")
    .select("id")
    .eq("association_id", association.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/app/dashboard");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: members } = await supabaseAdmin
    .from("association_members")
    .select("joined_at, tenant:tenants(id,name,subscription_tier,subscription_status,created_at)")
    .eq("association_id", association.id);

  const rows = await Promise.all(
    (members ?? []).map(async (member) => {
      const tenant = Array.isArray(member.tenant) ? member.tenant[0] : member.tenant;
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("total")
        .eq("tenant_id", tenant.id)
        .gte("created_at", monthStart.toISOString());
      const ordersThisMonth = orders?.length ?? 0;
      const gmvThisMonth = (orders ?? []).reduce((sum, order) => sum + Number(order.total ?? 0), 0);
      return {
        businessName: tenant.name,
        signupDate: tenant.created_at ?? member.joined_at,
        ordersThisMonth,
        gmvThisMonth,
        plan: tenant.subscription_tier ?? tenant.subscription_status ?? "trial",
      };
    }),
  );

  const activeThisMonth = rows.filter((row) => row.ordersThisMonth > 0).length;
  const aggregateGmv = rows.reduce((sum, row) => sum + row.gmvThisMonth, 0);
  const newSignups = rows.filter((row) => new Date(row.signupDate).getTime() >= monthStart.getTime()).length;
  const csv = [
    ["Business Name", "Signup Date", "Orders This Month", "GMV This Month", "Plan"].map(csvEscape).join(","),
    ...rows.map((row) =>
      [
        row.businessName,
        new Date(row.signupDate).toLocaleDateString("en-NG"),
        row.ordersThisMonth,
        row.gmvThisMonth,
        row.plan,
      ].map(csvEscape).join(","),
    ),
  ].join("\n");

  return (
    <main className="min-h-screen bg-blue-pale px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase text-blue-primary">Association Admin</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-ink">{association.name}</h1>
            <p className="mt-2 text-sm text-ink2">Aggregate member performance only. No customer or order-level details are shown.</p>
          </div>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download={`${association.slug}-members.csv`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-primary px-4 text-sm font-semibold text-white"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat label="Member Businesses" value={rows.length} />
          <Stat label="Active This Month" value={activeThisMonth} />
          <Stat label="GMV This Month" value={money(aggregateGmv)} />
          <Stat label="New Signups This Month" value={newSignups} />
        </section>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-blue-pale text-xs uppercase text-ink3">
                <tr>
                  <th className="px-5 py-3">Business Name</th>
                  <th className="px-5 py-3">Signup Date</th>
                  <th className="px-5 py-3">Orders This Month</th>
                  <th className="px-5 py-3">GMV This Month</th>
                  <th className="px-5 py-3">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-border">
                {rows.map((row) => (
                  <tr key={row.businessName}>
                    <td className="px-5 py-4 font-semibold text-ink">{row.businessName}</td>
                    <td className="px-5 py-4 text-ink2">{new Date(row.signupDate).toLocaleDateString("en-NG")}</td>
                    <td className="px-5 py-4">{row.ordersThisMonth}</td>
                    <td className="px-5 py-4 font-semibold text-ink">{money(row.gmvThisMonth)}</td>
                    <td className="px-5 py-4">{row.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="font-display text-3xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm font-semibold text-ink2">{label}</p>
    </Card>
  );
}
