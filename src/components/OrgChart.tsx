"use client";

import { useEffect, useMemo, useRef } from "react";
import { User } from "lucide-react";
import type { PersonNode } from "@/lib/tree";
import { CARD_H, CARD_W, layoutChart, shiftAll, type ManualLayout, type Pos } from "@/lib/layout";
import { divisiColorFor, type DivisiColorMap, type DivisiColorSet } from "@/lib/divisiColor";

const LONG_PRESS = 500; // ms

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
  manual,
  onMoveCard,
  onMoveBus,
  selectedAll = false,
  onSelectAll,
  onReplace,
}: {
  roots: PersonNode[];
  companyName?: string | null;
  logoUrl?: string | null;
  colorMap: DivisiColorMap;
  manual?: ManualLayout;
  /** Passing these turns on edit mode: cards and bus lines become draggable. */
  onMoveCard?: (id: string, pos: Pos) => void;
  onMoveBus?: (parentId: string, y: number) => void;
  /** Long-press selects every card and line; dragging then moves them all at once. */
  selectedAll?: boolean;
  onSelectAll?: (selected: boolean) => void;
  onReplace?: (manual: ManualLayout) => void;
}) {
  const layout = useMemo(() => layoutChart(roots, manual), [roots, manual]);
  const editing = !!onMoveCard;
  const canvasRef = useRef<HTMLDivElement>(null);

  // Esc drops the select-all block.
  useEffect(() => {
    if (!selectedAll) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onSelectAll?.(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedAll, onSelectAll]);

  /**
   * One pointer gesture in chart coordinates (divided by the CSS zoom).
   * Held still for LONG_PRESS ms it selects everything, and the rest of the
   * same drag moves the whole chart; otherwise it drags just `single`.
   */
  function gesture(e: React.PointerEvent, single?: { from: Pos; apply: (p: Pos) => void }) {
    const el = canvasRef.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1;
    const sx = e.clientX, sy = e.clientY;
    const base = layout;
    const snap = (v: number) => Math.round(v / 8) * 8;
    let all = selectedAll;
    let moved = false;
    let longPressed = false;
    const timer = window.setTimeout(() => {
      if (moved) return;
      all = longPressed = true;
      onSelectAll?.(true);
    }, LONG_PRESS);

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale, dy = (ev.clientY - sy) / scale;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true;
      if (all) onReplace?.(shiftAll(base, snap(dx), snap(dy)));
      else if (single) single.apply({ x: Math.max(0, snap(single.from.x + dx)), y: Math.max(0, snap(single.from.y + dy)) });
    };
    const up = () => {
      window.clearTimeout(timer);
      // A plain click on empty canvas clears the block.
      if (!single && !moved && !longPressed) onSelectAll?.(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

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
      <div
        ref={canvasRef}
        onPointerDown={editing ? (e) => gesture(e) : undefined}
        onContextMenu={editing ? (e) => e.preventDefault() : undefined}
        className={`relative ${editing ? "select-none bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]" : ""}`}
        style={{ width: layout.width + (editing ? CARD_W : 0), height: layout.height + (editing ? CARD_H : 0) }}
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          {layout.lines.map((pts, i) => (
            <polyline
              key={i}
              points={pts.join(" ")}
              fill="none"
              stroke={selectedAll ? "#0ea5e9" : "#64748b"}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
        </svg>
        {layout.cards.map(({ node, x, y }) => (
          <div
            key={node.id}
            className={`absolute ${
              !editing
                ? ""
                : selectedAll
                  ? "cursor-move rounded-lg bg-sky-50 ring-4 ring-sky-500"
                  : "cursor-move rounded-lg ring-2 ring-sky-300 hover:ring-sky-500"
            }`}
            style={{ left: x, top: y, touchAction: editing ? "none" : undefined }}
            onPointerDown={editing ? (e) => gesture(e, { from: { x, y }, apply: (p) => onMoveCard!(node.id, p) }) : undefined}
          >
            <Card node={node} colorMap={colorMap} />
          </div>
        ))}
        {editing &&
          onMoveBus &&
          layout.buses.map((b) => (
            <div
              key={b.parentId}
              title="Geser untuk mengubah tinggi garis"
              className="group absolute flex cursor-ns-resize items-center justify-center"
              style={{ left: b.x1, top: b.y - 8, width: Math.max(b.x2 - b.x1, 24), height: 16, touchAction: "none" }}
              onPointerDown={(e) => gesture(e, { from: { x: b.x1, y: b.y }, apply: (p) => onMoveBus(b.parentId, p.y) })}
            >
              <div className="h-1 w-full rounded bg-sky-400/0 group-hover:bg-sky-400/60" />
              <div className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow" />
            </div>
          ))}
      </div>
    </div>
  );
}
