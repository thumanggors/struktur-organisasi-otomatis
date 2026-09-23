import Link from "next/link";
import { db } from "@/lib/db";
import PersonTable from "@/components/PersonTable";

export const dynamic = "force-dynamic";

export default async function OrangPage() {
  const people = await db.person.findMany({ orderBy: { nama: "asc" } });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Daftar Orang</h1>
        <Link href="/orang/baru" className="rounded bg-black px-3 py-2 text-white">
          Tambah Orang
        </Link>
      </div>
      <PersonTable people={people} />
    </main>
  );
}
