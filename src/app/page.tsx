import { db } from "@/lib/db";
import { buildTree } from "@/lib/tree";
import OrgChart from "@/components/OrgChartLazy";
import ExportButtons from "@/components/ExportButtonsLazy";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const people = await db.person.findMany();
  const roots = buildTree(people);

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Struktur Organisasi</h1>
      <ExportButtons />
      <div className="overflow-auto">
        <OrgChart roots={roots} />
      </div>
    </main>
  );
}
