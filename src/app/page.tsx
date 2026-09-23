import { db } from "@/lib/db";
import { buildTree } from "@/lib/tree";
import { getSettings } from "@/lib/settings";
import OrgChart from "@/components/OrgChartLazy";
import ExportButtons from "@/components/ExportButtonsLazy";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [people, settings] = await Promise.all([db.person.findMany(), getSettings()]);
  const roots = buildTree(people);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Struktur Organisasi</h1>
      <p className="mt-1 text-sm text-slate-500">Tampilan lengkap seluruh struktur organisasi.</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <ExportButtons />
        <div className="overflow-auto">
          <OrgChart roots={roots} companyName={settings?.companyName} logoUrl={settings?.logoUrl} />
        </div>
      </div>
    </div>
  );
}
