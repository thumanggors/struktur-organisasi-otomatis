import Link from "next/link";
import { db } from "@/lib/db";
import { buildTree, listDivisi, withAncestors } from "@/lib/tree";
import OrgChart from "@/components/OrgChartLazy";
import ExportButtons from "@/components/ExportButtonsLazy";

export const dynamic = "force-dynamic";

export default async function DivisiPage({
  searchParams,
}: {
  searchParams: Promise<{ divisi?: string }>;
}) {
  const { divisi } = await searchParams;
  const people = await db.person.findMany();
  const divisiList = listDivisi(people);

  const roots = divisi ? buildTree(withAncestors(people, divisi)) : [];

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Organisasi Per Divisi</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pilih divisi untuk melihat anggotanya beserta jalur atasan sampai ke posisi paling atas.
      </p>

      {divisiList.length === 0 ? (
        <p className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Belum ada data divisi. Isi field Divisi saat menambah atau mengedit orang di{" "}
          <Link href="/orang" className="font-medium text-sky-700 underline">
            Kelola Orang
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {divisiList.map((d) => (
            <Link
              key={d}
              href={`/divisi?divisi=${encodeURIComponent(d)}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                d === divisi
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {d}
            </Link>
          ))}
        </div>
      )}

      {divisi && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <ExportButtons />
          <div className="overflow-auto">
            <OrgChart roots={roots} />
          </div>
        </div>
      )}
    </div>
  );
}
