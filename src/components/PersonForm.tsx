"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

type Person = {
  id: string;
  nama: string;
  jabatan: string;
  divisi: string | null;
  jobdesk: string | null;
  fotoUrl: string | null;
  atasanId: string | null;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="nama" className={labelClass}>
          Nama
        </label>
        <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} required />
      </div>

      <div>
        <label htmlFor="jabatan" className={labelClass}>
          Jabatan
        </label>
        <input id="jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} className={inputClass} required />
      </div>

      <div>
        <label htmlFor="divisi" className={labelClass}>
          Divisi <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <input id="divisi" value={divisi} onChange={(e) => setDivisi(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label htmlFor="jobdesk" className={labelClass}>
          Jobdesk <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea id="jobdesk" value={jobdesk} onChange={(e) => setJobdesk(e.target.value)} rows={3} className={inputClass} />
      </div>

      <div>
        <label htmlFor="atasan" className={labelClass}>
          Atasan
        </label>
        <select id="atasan" value={atasanId} onChange={(e) => setAtasanId(e.target.value)} className={inputClass}>
          <option value="">-- Tanpa atasan (posisi puncak) --</option>
          {allPeople
            .filter((p) => p.id !== initial?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label htmlFor="foto" className={labelClass}>
          Foto <span className="font-normal text-slate-400">(opsional, JPG/PNG, maks 5MB)</span>
        </label>
        <div className="flex items-center gap-3">
          <label
            htmlFor="foto"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Pilih Foto
          </label>
          <input id="foto" type="file" accept="image/jpeg,image/png" onChange={handleFotoChange} className="hidden" />
          {fotoUrl && <img src={fotoUrl} alt="Preview" className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100" />}
        </div>
        {uploading && <p className="mt-1.5 text-sm text-slate-500">Mengunggah foto...</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="mt-2 cursor-pointer rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
      >
        Simpan
      </button>
    </form>
  );
}
