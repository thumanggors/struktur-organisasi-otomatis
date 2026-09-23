import { db } from "@/lib/db";
import { buildTree, listDivisi } from "@/lib/tree";
import { divisiColorMap } from "@/lib/divisiColor";
import { getSettings } from "@/lib/settings";
import EditableOrgChart from "@/components/EditableOrgChart";
import { EMPTY_MANUAL, placeNewcomers, SIDES, type ManualLayout, type Side } from "@/lib/layout";
import ExportButtons from "@/components/ExportButtonsLazy";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [people, settings] = await Promise.all([db.person.findMany(), getSettings()]);
  const roots = buildTree(people);
  const colorMap = divisiColorMap(listDivisi(people));
  const stored: ManualLayout = structuredClone(EMPTY_MANUAL);
  for (const p of people) {
    if (p.posX !== null && p.posY !== null) stored.pos[p.id] = { x: p.posX, y: p.posY };
    if (p.busY !== null) stored.busY[p.id] = p.busY;
    if (p.trunkX !== null) stored.trunkX[p.id] = p.trunkX;
    if (p.linkOff !== null) stored.linkOff[p.id] = p.linkOff;
    if (SIDES.includes(p.linkSide as Side)) stored.linkSide[p.id] = p.linkSide as Side;
    if (p.linkVia !== null) stored.linkVia[p.id] = p.linkVia;
  }
  const saved = placeNewcomers(roots, stored);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Struktur Organisasi</h1>
      <p className="mt-1 text-sm text-slate-500">Tampilan lengkap seluruh struktur organisasi.</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <ExportButtons />
        <EditableOrgChart
          roots={roots}
          saved={saved}
          companyName={settings?.companyName}
          logoUrl={settings?.logoUrl}
          colorMap={colorMap}
        />
      </div>
    </div>
  );
}
