"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Network, User } from "lucide-react";
import type { PersonNode } from "@/lib/tree";
import { CARD_H, CARD_W, cardsInRect, layoutChart, shiftSelected, EMPTY_MANUAL, SIDES, type LineHandle, type ManualLayout, type Side, type Pos, type Rect } from "@/lib/layout";
import { divisiColorFor, type DivisiColorMap, type DivisiColorSet } from "@/lib/divisiColor";

const LONG_PRESS = 500; // ms

const SIDE_DOT: Record<Side, { label: string; style: React.CSSProperties }> = {
  top: { label: "atas", style: { left: "50%", top: 0 } },
  bottom: { label: "bawah", style: { left: "50%", top: "100%" } },
  left: { label: "kiri", style: { left: 0, top: "50%" } },
  right: { label: "kanan", style: { left: "100%", top: "50%" } },
};

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
  onMoveLine,
  onSetSide,
  onSetVia,
  onRelayout,
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
  onMoveLine?: (prop: LineHandle["prop"], id: string, value: number) => void;
  /** Picks which side of a report's card the line from its boss attaches to. */
  onSetSide?: (id: string, side: Side) => void;
  /** Hangs a report's connector off another person's lines (null = back to the boss's). */
  onSetVia?: (id: string, via: string | null) => void;
  /** Re-lays everyone under this card out in horizontal rows. */
  onRelayout?: (id: string) => void;
  /** Box-selected cards; dragging any of them moves the whole selection. */
  selected?: Set<string>;
  onSelect?: (ids: Set<string>) => void;
  onReplace?: (manual: ManualLayout) => void;
}) {
  const layout = useMemo(() => layoutChart(roots, manual), [roots, manual]);
  const editing = !!onMoveCard;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Rect | null>(null);
  const [linkDraft, setLinkDraft] = useState<Rect | null>(null);
  const bossOf = useMemo(() => {
    const m = new Map<string, string>();
    const walk = (n: PersonNode) => n.children.forEach((c) => (m.set(c.id, n.id), walk(c)));
    roots.forEach(walk);
    return m;
  }, [roots]);
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
      else if (group) onReplace?.(shiftSelected(base, manual ?? EMPTY_MANUAL, group, snap(dx), snap(dy)));
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

  /**
   * Dragging a side dot: drop it on another person's card or line to draw this
   * report's connector from their lines (on the real boss = back to normal).
   * A plain click is handled by the dot's onClick (pick the side).
   */
  function linkGesture(e: React.PointerEvent, id: string, side: Side, from: Pos) {
    const el = canvasRef.current;
    if (!el || e.button !== 0) return;
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const scale = rect.width / el.offsetWidth || 1;
    const toChart = (cx: number, cy: number) => ({ x: (cx - rect.left) / scale, y: (cy - rect.top) / scale });
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      moved = true;
      const p = toChart(ev.clientX, ev.clientY);
      setLinkDraft({ x1: from.x, y1: from.y, x2: p.x, y2: p.y });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLinkDraft(null);
      if (!moved) return;
      const target = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest<HTMLElement>("[data-link-target]")?.dataset.linkTarget;
      if (!target || target === id) return;
      onSetSide?.(id, side);
      onSetVia?.(id, target === bossOf.get(id) ? null : target);
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
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {linkDraft && (
            <line
              x1={linkDraft.x1}
              y1={linkDraft.y1}
              x2={linkDraft.x2}
              y2={linkDraft.y2}
              stroke="#0ea5e9"
              strokeWidth={3}
              strokeDasharray="6 4"
            />
          )}
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
            data-link-target={node.id}
            className={`group absolute ${
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
            {onRelayout && node.children.length > 0 && (
              <button
                type="button"
                title="Susun horizontal: rapikan semua bawahan kartu ini berjajar mendatar"
                aria-label={`Susun horizontal bawahan ${node.nama}`}
                className="absolute right-1.5 bottom-1.5 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-sky-200 bg-white text-sky-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-sky-50 focus-visible:opacity-100"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRelayout(node.id)}
              >
                <Network className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {onSetSide &&
              layout.sides[node.id] &&
              SIDES.map((side) => {
                const active = layout.sides[node.id] === side;
                return (
                  <button
                    key={side}
                    type="button"
                    title={`Klik: garis menempel di sisi ${SIDE_DOT[side].label}. Tarik ke kartu/garis orang lain untuk menyambung ke garisnya.`}
                    aria-label={`Tempelkan garis di sisi ${SIDE_DOT[side].label}`}
                    aria-pressed={active}
                    className={`absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 transition-opacity ${
                      active
                        ? "border-white bg-sky-500 opacity-0 shadow group-hover:opacity-100"
                        : "border-sky-500 bg-white opacity-0 group-hover:opacity-100 hover:bg-sky-100"
                    }`}
                    style={SIDE_DOT[side].style}
                    onPointerDown={(e) => {
                      const dot = { top: [0.5, 0], bottom: [0.5, 1], left: [0, 0.5], right: [1, 0.5] }[side];
                      linkGesture(e, node.id, side, { x: x + dot[0] * CARD_W, y: y + dot[1] * CARD_H });
                    }}
                    onClick={() => onSetSide(node.id, side)}
                  />
                );
              })}
          </div>
        ))}
        {editing &&
          onMoveLine &&
          layout.handles.map((h) => {
            const horizontal = h.y1 === h.y2;
            const [left, top] = [Math.min(h.x1, h.x2), Math.min(h.y1, h.y2)];
            const [w, ht] = [Math.abs(h.x2 - h.x1), Math.abs(h.y2 - h.y1)];
            const setAt = (v: number) => onMoveLine(h.prop, h.id, Math.min(h.max, Math.max(h.min, v)) - h.origin);
            return (
              <div
                key={`${h.prop}-${h.id}`}
                data-link-target={h.owner}
                title={horizontal ? "Geser naik/turun" : "Geser kiri/kanan"}
                className={`group absolute flex items-center justify-center ${horizontal ? "cursor-ns-resize" : "cursor-ew-resize"}`}
                style={
                  horizontal
                    ? { left, top: top - 6, width: Math.max(w, 12), height: 12, touchAction: "none" }
                    : { left: left - 6, top, width: 12, height: Math.max(ht, 12), touchAction: "none" }
                }
                onPointerDown={(e) =>
                  gesture(e, {
                    from: { x: h.x1, y: h.y1 },
                    apply: (p) => setAt(h.axis === "x" ? p.x : p.y),
                  })
                }
              >
                <div className={`rounded bg-sky-400/0 group-hover:bg-sky-400/60 ${horizontal ? "h-1 w-full" : "h-full w-1"}`} />
                <div
                  className={`absolute h-3 w-3 rounded-full border-2 border-white bg-sky-500 shadow ${
                    h.prop === "busY" ? "" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </div>
            );
          })}
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
