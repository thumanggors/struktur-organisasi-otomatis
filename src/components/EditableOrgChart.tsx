"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Move, Save, X, RotateCcw } from "lucide-react";
import OrgChart from "@/components/OrgChartLazy";
import ZoomableChart from "@/components/ZoomableChart";
import { layoutChart, type ManualLayout } from "@/lib/layout";
import type { PersonNode } from "@/lib/tree";
import type { DivisiColorMap } from "@/lib/divisiColor";

const btn =
  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export default function EditableOrgChart({
  roots,
  saved,
  companyName,
  logoUrl,
  colorMap,
}: {
  roots: PersonNode[];
  saved: ManualLayout;
  companyName?: string | null;
  logoUrl?: string | null;
  colorMap: DivisiColorMap;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ManualLayout | null>(null);
  // Last saved layout, shown until router.refresh() delivers the new `saved` prop.
  const [committed, setCommitted] = useState<ManualLayout | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "PUT" | "DELETE", next: ManualLayout, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/layout", { method, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) throw new Error();
      setCommitted(next);
      setDraft(null);
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("Gagal menyimpan tata letak. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    // Snapshot every card, so auto-placed ones stay put next time too.
    const { cards } = layoutChart(roots, draft!);
    const items = cards.map((c) => ({ id: c.node.id, posX: c.x, posY: c.y, busY: draft!.busY[c.node.id] ?? null }));
    const pos = Object.fromEntries(cards.map((c) => [c.node.id, { x: c.x, y: c.y }]));
    send("PUT", { pos, busY: draft!.busY }, { items });
  }

  function reset() {
    if (confirm("Kembalikan semua posisi ke tata letak otomatis?")) send("DELETE", { pos: {}, busY: {} });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {draft ? (
          <>
            <button onClick={save} disabled={busy} className={`${btn} border-sky-300 bg-sky-600 text-white hover:bg-sky-700`}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Simpan
            </button>
            <button onClick={() => (setDraft(null), setSelected(new Set()))} disabled={busy} className={`${btn} border-slate-200 bg-white hover:bg-slate-50`}>
              <X className="h-4 w-4" aria-hidden="true" />
              Batal
            </button>
            <button onClick={reset} disabled={busy} className={`${btn} border-amber-200 bg-white hover:bg-amber-50`}>
              <RotateCcw className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Reset Otomatis
            </button>
            <span className="text-sm text-slate-500">
              {selected.size > 0
                ? `${selected.size} kartu terblok — geser salah satunya untuk memindahkan semuanya. Klik area kosong atau Esc untuk batal.`
                : "Geser kartu, atau titik biru pada garis untuk mengubah tinggi garis. Tarik di area kosong (atau tekan lama lalu tarik) untuk memblok beberapa kartu."}
            </span>
          </>
        ) : (
          <button onClick={() => setDraft(committed ?? saved)} className={`${btn} border-slate-200 bg-white hover:bg-slate-50`}>
            <Move className="h-4 w-4 text-sky-600" aria-hidden="true" />
            Edit Tata Letak
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <ZoomableChart>
        <OrgChart
          roots={roots}
          companyName={companyName}
          logoUrl={logoUrl}
          colorMap={colorMap}
          manual={draft ?? committed ?? saved}
          onMoveCard={draft ? (id, p) => setDraft((d) => d && { ...d, pos: { ...d.pos, [id]: p } }) : undefined}
          onMoveBus={draft ? (id, y) => setDraft((d) => d && { ...d, busY: { ...d.busY, [id]: y } }) : undefined}
          selected={draft ? selected : undefined}
          onSelect={setSelected}
          onReplace={setDraft}
        />
      </ZoomableChart>
    </div>
  );
}
