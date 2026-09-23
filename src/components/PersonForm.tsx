"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  nama: string;
  jabatan: string;
  divisi: string | null;
  jobdesk: string | null;
  fotoUrl: string | null;
  atasanId: string | null;
};

export default function PersonForm({
  initial,
  allPeople,
}: {
  initial?: Person;
  allPeople: Pick<Person, "id" | "nama">[];
}) {
  const router = useRouter();
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [jabatan, setJabatan] = useState(initial?.jabatan ?? "");
  const [divisi, setDivisi] = useState(initial?.divisi ?? "");
  const [jobdesk, setJobdesk] = useState(initial?.jobdesk ?? "");
  const [atasanId, setAtasanId] = useState(initial?.atasanId ?? "");
  const [fotoUrl, setFotoUrl] = useState(initial?.fotoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const ALLOWED_TYPES = ["image/jpeg", "image/png"];
  const MAX_SIZE = 5 * 1024 * 1024;

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipe file harus JPG atau PNG");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Ukuran file maksimal 5MB");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Upload gagal");
      return;
    }
    const { url } = await res.json();
    setFotoUrl(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      nama,
      jabatan,
      divisi: divisi || null,
      jobdesk: jobdesk || null,
      fotoUrl: fotoUrl || null,
      atasanId: atasanId || null,
    };

    const res = await fetch(initial ? `/api/orang/${initial.id}` : "/api/orang", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Gagal menyimpan");
      return;
    }

    router.push("/orang");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama" className="rounded border px-3 py-2" required />
      <input value={jabatan} onChange={(e) => setJabatan(e.target.value)} placeholder="Jabatan" className="rounded border px-3 py-2" required />
      <input value={divisi} onChange={(e) => setDivisi(e.target.value)} placeholder="Divisi (opsional)" className="rounded border px-3 py-2" />
      <textarea value={jobdesk} onChange={(e) => setJobdesk(e.target.value)} placeholder="Jobdesk (opsional)" className="rounded border px-3 py-2" />
      <select value={atasanId} onChange={(e) => setAtasanId(e.target.value)} className="rounded border px-3 py-2">
        <option value="">-- Tanpa atasan (posisi puncak) --</option>
        {allPeople
          .filter((p) => p.id !== initial?.id)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
      </select>
      <input type="file" accept="image/jpeg,image/png" onChange={handleFotoChange} />
      {uploading && <p className="text-sm text-gray-500">Mengunggah foto...</p>}
      {fotoUrl && <img src={fotoUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="rounded bg-black px-3 py-2 text-white">
        Simpan
      </button>
    </form>
  );
}
