"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, User, Search } from "lucide-react";
import { divisiColorFor, divisiColorMap } from "@/lib/divisiColor";
import { listDivisi } from "@/lib/tree";

type Person = {
  id: string;
  nama: string;
  jabatan: string;
  divisi: string | null;
  fotoUrl: string | null;
};

export default function PersonTable({ people }: { people: Person[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const colorMap = useMemo(() => divisiColorMap(listDivisi(people)), [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) => p.nama.toLowerCase().includes(q) || p.jabatan.toLowerCase().includes(q) || p.divisi?.toLowerCase().includes(q)
    );
  }, [people, query]);

  async function handleDelete(id: string) {
    if (!confirm("Hapus orang ini? Bawahan langsungnya akan naik jadi posisi puncak.")) return;
    await fetch(`/api/orang/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (people.length === 0) {
    return <p className="p-6 text-sm text-slate-500">Belum ada data orang.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, jabatan, atau divisi..."
          aria-label="Cari orang"
          className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-slate-400">
          {filtered.length} dari {people.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">Tidak ada yang cocok dengan pencarian &quot;{query}&quot;.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Foto</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Jabatan</th>
              <th className="px-4 py-3 font-medium">Divisi</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  {p.fotoUrl ? (
                    <img src={p.fotoUrl} alt={p.nama} className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <User className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{p.nama}</td>
                <td className="px-4 py-3 text-slate-600">{p.jabatan}</td>
                <td className="px-4 py-3">
                  {p.divisi ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${divisiColorFor(colorMap, p.divisi).badge}`}>
                      {p.divisi}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/orang/${p.id}/edit`}
                      aria-label={`Edit ${p.nama}`}
                      className="flex items-center gap-1 text-sky-700 hover:text-sky-900"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id)}
                      aria-label={`Hapus ${p.nama}`}
                      className="flex cursor-pointer items-center gap-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
