"use client";

import { useMemo } from "react";
import { User } from "lucide-react";
import type { PersonNode } from "@/lib/tree";
import { CARD_H, CARD_W, layoutChart } from "@/lib/layout";
import { divisiColorFor, type DivisiColorMap, type DivisiColorSet } from "@/lib/divisiColor";

const NEUTRAL: DivisiColorSet = {
  badge: "bg-slate-100 text-slate-700",
  solid: "bg-slate-800",
  border: "border-slate-800",
  bg: "bg-slate-800",
};

function Card({ node, colorMap }: { node: PersonNode; colorMap: DivisiColorMap }) {
  const color = node.divisi ? divisiColorFor(colorMap, node.divisi) : NEUTRAL;
  return (
    <div
      className="flex flex-col items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-center shadow-sm"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className={`h-1.5 w-full ${color.bg}`} aria-hidden="true" />
      <div className="flex w-full flex-col items-center gap-1 p-3" title={node.jobdesk || undefined}>
        {node.fotoUrl ? (
          <img src={node.fotoUrl} alt={node.nama} className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-100" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
        <p className="w-full truncate font-semibold text-slate-900" title={node.nama}>{node.nama}</p>
        <p className="line-clamp-2 text-xs leading-4 text-slate-500">{node.jabatan}</p>
        {node.divisi && (
          <span className={`mt-0.5 max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium ${color.badge}`}>{node.divisi}</span>
        )}
      </div>
    </div>
  );
}

export default function OrgChart({
  roots,
  companyName,
  logoUrl,
  colorMap,
}: {
  roots: PersonNode[];
  companyName?: string | null;
  logoUrl?: string | null;
  colorMap: DivisiColorMap;
}) {
  const layout = useMemo(() => layoutChart(roots), [roots]);

  if (roots.length === 0) {
    return <p className="text-slate-500">Belum ada data orang.</p>;
  }

  return (
    <div id="org-chart-capture" className="inline-block bg-white p-4">
      {(companyName || logoUrl) && (
        <div className="mb-6 flex flex-col items-center gap-2 border-b border-slate-100 pb-4">
          {logoUrl && <img src={logoUrl} alt={companyName ?? "Logo perusahaan"} className="h-16 w-16 object-contain" />}
          {companyName && <h2 className="text-lg font-semibold text-slate-900">{companyName}</h2>}
        </div>
      )}
      <div className="relative" style={{ width: layout.width, height: layout.height }}>
        <svg className="absolute inset-0" width={layout.width} height={layout.height} aria-hidden="true">
          {layout.lines.map((pts, i) => (
            <polyline key={i} points={pts.join(" ")} fill="none" stroke="#64748b" strokeWidth={3} strokeLinecap="round" />
          ))}
        </svg>
        {layout.cards.map(({ node, x, y }) => (
          <div key={node.id} className="absolute" style={{ left: x, top: y }}>
            <Card node={node} colorMap={colorMap} />
          </div>
        ))}
      </div>
    </div>
  );
}
