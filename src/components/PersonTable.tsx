"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  nama: string;
  jabatan: string;
  divisi: string | null;
  fotoUrl: string | null;
};

export default function PersonTable({ people }: { people: Person[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Hapus orang ini? Bawahan langsungnya akan naik jadi posisi puncak.")) return;
    await fetch(`/api/orang/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b">
          <th className="py-2">Foto</th>
          <th className="py-2">Nama</th>
          <th className="py-2">Jabatan</th>
          <th className="py-2">Divisi</th>
          <th className="py-2">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {people.map((p) => (
          <tr key={p.id} className="border-b">
            <td className="py-2">
              {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nama} className="h-10 w-10 rounded-full object-cover" /> : "-"}
            </td>
            <td className="py-2">{p.nama}</td>
            <td className="py-2">{p.jabatan}</td>
            <td className="py-2">{p.divisi ?? "-"}</td>
            <td className="flex gap-2 py-2">
              <Link href={`/orang/${p.id}/edit`} className="text-blue-600 underline">
                Edit
              </Link>
              <button onClick={() => handleDelete(p.id)} className="text-red-600 underline">
                Hapus
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
