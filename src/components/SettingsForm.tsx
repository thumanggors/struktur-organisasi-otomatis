"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const MAX_SIZE = 5 * 1024 * 1024;

export default function SettingsForm({
  initialCompanyName,
  initialLogoUrl,
}: {
  initialCompanyName: string | null;
  initialLogoUrl: string | null;
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialCompanyName ?? "");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    setError(null);
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
    setLogoUrl(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: companyName || null, logoUrl: logoUrl || null }),
    });

    if (!res.ok) {
      setError("Gagal menyimpan pengaturan");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="companyName" className={labelClass}>
          Label / Nama Perusahaan
        </label>
        <input
          id="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Contoh: PT Sumber Jaya Abadi"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="logo" className={labelClass}>
          Logo Perusahaan <span className="font-normal text-slate-400">(opsional, JPG/PNG, maks 5MB)</span>
        </label>
        <div className="flex items-center gap-3">
          <label
            htmlFor="logo"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Pilih Logo
          </label>
          <input id="logo" type="file" accept="image/jpeg,image/png" onChange={handleLogoChange} className="hidden" />
          {logoUrl && <img src={logoUrl} alt="Preview logo" className="h-12 w-12 rounded object-contain ring-2 ring-slate-100" />}
        </div>
        {uploading && <p className="mt-1.5 text-sm text-slate-500">Mengunggah logo...</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Pengaturan tersimpan.</p>}

      <button
        type="submit"
        className="mt-2 cursor-pointer rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
      >
        Simpan
      </button>
    </form>
  );
}
