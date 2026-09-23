"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { User } from "lucide-react";
import type { PersonNode } from "@/lib/tree";
import { CARD_H, CARD_W, cardsInRect, layoutChart, shiftSelected, type ManualLayout, type Pos, type Rect } from "@/lib/layout";
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
  selected,
  onSelect,
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
  /** Box-selected cards; dragging any of them moves the whole selection. */
  selected?: Set<string>;
  onSelect?: (ids: Set<string>) => void;
  onReplace?: (manual: ManualLayout) => void;
}) {
  const layout = useMemo(() => layoutChart(roots, manual), [roots, manual]);
  const editing = !!onMoveCard;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Rect | null>(null);
  const hasSelection = !!selected && selected.size > 0;

  // Esc drops the selection.
  useEffect(() => {
    if (!hasSelection) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onSelect?.(new Set());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSelection, onSelect]);

  /**
   * One pointer gesture in chart coordinates (divided by the CSS zoom).
   * - on a selected card: drags the whole selection
   * - on any other card / bus handle: drags just `single`
   * - on empty canvas with a mouse: drag a selection box; a plain click clears
   * - touch/pen: held still LONG_PRESS ms on canvas or a card, then drag a selection box
   */
  function gesture(e: React.PointerEvent, single?: { id?: string; from: Pos; apply: (p: Pos) => void }) {
    const el = canvasRef.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const scale = rect.width / el.offsetWidth || 1;
    const toChart = (cx: number, cy: number) => ({ x: (cx - rect.left) / scale, y: (cy - rect.top) / scale });
    const start = toChart(e.clientX, e.clientY);
    const base = layout;
    const snap = (v: number) => Math.round(v / 8) * 8;
    const group = single?.id && selected?.has(single.id) ? selected : null;
    let moved = false;
    const mouse = e.pointerType === "mouse";
    let boxing = !single && mouse;
    // Touch has no hover-drag on empty canvas, so a long press (canvas or card) starts the box.
    // With a mouse a slow card drag must stay a drag; bus handles only ever drag.
    const timer =
      mouse || (single && !single.id)
        ? undefined
        : window.setTimeout(() => {
            if (moved) return;
            boxing = true;
            setBox({ x1: start.x, y1: start.y, x2: start.x, y2: start.y });
          }, LONG_PRESS);

    const move = (ev: PointerEvent) => {
      const p = toChart(ev.clientX, ev.clientY);
      const dx = p.x - start.x, dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true;
      if (boxing) setBox({ x1: start.x, y1: start.y, x2: p.x, y2: p.y });
      else if (group) onReplace?.(shiftSelected(base, group, snap(dx), snap(dy)));
      else if (single) single.apply({ x: Math.max(0, snap(single.from.x + dx)), y: Math.max(0, snap(single.from.y + dy)) });
    };
    const up = (ev: PointerEvent) => {
      window.clearTimeout(timer);
      if (boxing && moved) {
        const p = toChart(ev.clientX, ev.clientY);
        onSelect?.(new Set(cardsInRect(base, { x1: start.x, y1: start.y, x2: p.x, y2: p.y })));
      } else if (!single && !moved) {
        onSelect?.(new Set());
      }
      setBox(null);
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
              stroke="#64748b"
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
                : selected?.has(node.id)
                  ? "cursor-move rounded-lg ring-4 ring-sky-500"
                  : "cursor-move rounded-lg ring-2 ring-sky-300 hover:ring-sky-500"
            }`}
            style={{ left: x, top: y, touchAction: editing ? "none" : undefined }}
            onPointerDown={editing ? (e) => gesture(e, { from: { x, y }, id: node.id, apply: (p) => onMoveCard!(node.id, p) }) : undefined}
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
        {box && (
          <div
            className="pointer-events-none absolute rounded border-2 border-dashed border-sky-500 bg-sky-400/10"
            style={{
              left: Math.min(box.x1, box.x2),
              top: Math.min(box.y1, box.y2),
              width: Math.abs(box.x2 - box.x1),
              height: Math.abs(box.y2 - box.y1),
            }}
          />
        )}
      </div>
    </div>
  );
}
