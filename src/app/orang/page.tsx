import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import PersonTable from "@/components/PersonTable";

export const dynamic = "force-dynamic";

export default async function OrangPage() {
  const people = await db.person.findMany({ orderBy: { nama: "asc" } });

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Kelola Orang</h1>
          <p className="mt-1 text-sm text-slate-500">Tambah, ubah, atau hapus data orang dalam organisasi.</p>
        </div>
        <Link
          href="/orang/baru"
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Orang
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <PersonTable people={people} />
      </div>
    </div>
  );
}
