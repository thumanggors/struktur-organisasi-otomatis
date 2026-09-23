import { splitStaff, type PersonNode } from "./tree";

/** Fixed card size: every position is computed from it, so cards can never overlap. */
export const CARD_W = 208;
export const CARD_H = 176;

const GAP_X = 32; // between sibling subtrees
const GAP_Y = 56; // between a parent and its row of reports
const TICK = 24; // trunk-to-card connector in staff branches and leaf grids
const GRID_ROW_GAP = 16;

export type Pos = { x: number; y: number };
export type Point = [number, number];
/** "side": ticked onto the parent's trunk (staff, leaf grid). "bus": hangs from the horizontal bus below the parent. */
export type LinkKind = "side" | "bus";
export type Edge = { parentId: string; childId: string; kind: LinkKind };
/**
 * Saved hand edits. Line tweaks are stored relative to the card they attach to,
 * so they travel with it: `trunkX` is the parent's trunk x from its card's left;
 * `linkOff` is where a report's own connector meets its card (x from the left
 * for a bus drop, y from the top for a side tick). `busY` is absolute.
 */
export type ManualLayout = {
  pos: Record<string, Pos>;
  busY: Record<string, number>;
  trunkX: Record<string, number>;
  linkOff: Record<string, number>;
};
export const EMPTY_MANUAL: ManualLayout = { pos: {}, busY: {}, trunkX: {}, linkOff: {} };

/** A draggable line segment; dragging along `axis` sets `prop[id]` to (coordinate - origin), clamped to [min, max]. */
export type LineHandle = {
  prop: "busY" | "trunkX" | "linkOff";
  id: string;
  axis: "x" | "y";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  origin: number;
  min: number;
  max: number;
};

export type Layout = {
  cards: { node: PersonNode; x: number; y: number }[];
  lines: Point[][];
  handles: LineHandle[];
  width: number;
  height: number;
};

type Sub = { pos: Map<string, Pos>; minX: number; maxX: number; height: number };

function place(into: Sub, from: Sub, dx: number, dy: number) {
  for (const [id, p] of from.pos) into.pos.set(id, { x: p.x + dx, y: p.y + dy });
  into.minX = Math.min(into.minX, from.minX + dx);
  into.maxX = Math.max(into.maxX, from.maxX + dx);
  into.height = Math.max(into.height, from.height + dy);
}

/**
 * Auto-positions a subtree with its card's top-center at (0, 0), packing each
 * child subtree by its full bounding box so boxes never intersect.
 * ponytail: bounding-box packing, not contour-based (Reingold–Tilford); wastes some width on ragged trees.
 */
function layoutNode(node: PersonNode, edges: Edge[]): Sub {
  const out: Sub = { pos: new Map([[node.id, { x: -CARD_W / 2, y: 0 }]]), minX: -CARD_W / 2, maxX: CARD_W / 2, height: CARD_H };
  const { staff, line } = splitStaff(node.children);
  let cursor = CARD_H;

  // Staff (Sekretaris/Wakil) hang off the right of the trunk, above the line reports.
  for (const s of staff) {
    edges.push({ parentId: node.id, childId: s.id, kind: "side" });
    const sub = layoutNode(s, edges);
    const top = cursor + GAP_Y / 2;
    place(out, sub, TICK - sub.minX, top);
    cursor = sub.height + top;
  }

  if (line.length === 0) return out;
  const top = cursor + GAP_Y;

  if (line.length > 3 && line.every((c) => c.children.length === 0)) {
    // Two-column grid split by the trunk.
    line.forEach((child, i) => {
      edges.push({ parentId: node.id, childId: child.id, kind: "side" });
      const y = top + Math.floor(i / 2) * (CARD_H + GRID_ROW_GAP);
      const x = i % 2 === 0 ? -TICK - CARD_W : TICK;
      place(out, { pos: new Map([[child.id, { x: 0, y: 0 }]]), minX: 0, maxX: CARD_W, height: CARD_H }, x, y);
    });
    return out;
  }

  const subs = line.map((c) => {
    edges.push({ parentId: node.id, childId: c.id, kind: "bus" });
    return layoutNode(c, edges);
  });
  const total = subs.reduce((w, s) => w + (s.maxX - s.minX), 0) + GAP_X * (subs.length - 1);
  let x = -total / 2;
  for (const sub of subs) {
    place(out, sub, x - sub.minX, top);
    x += sub.maxX - sub.minX + GAP_X;
  }
  return out;
}

const ATTACH_MARGIN = 16; // keep connectors this far inside a card's edge
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Orthogonal connectors derived from final card positions, so they always follow the cards. */
function route(pos: Map<string, Pos>, edges: Edge[], manual: ManualLayout) {
  const lines: Point[][] = [];
  const handles: LineHandle[] = [];
  const byParent = new Map<string, Edge[]>();
  for (const e of edges) byParent.set(e.parentId, [...(byParent.get(e.parentId) ?? []), e]);
  // Where a connector meets a card along one side of length `len`.
  const along = (id: string, start: number, len: number) =>
    start + clamp(manual.linkOff[id] ?? len / 2, ATTACH_MARGIN, len - ATTACH_MARGIN);

  for (const [parentId, kids] of byParent) {
    const p = pos.get(parentId)!;
    const tx = p.x + clamp(manual.trunkX[parentId] ?? CARD_W / 2, ATTACH_MARGIN, CARD_W - ATTACH_MARGIN);
    const bottom = p.y + CARD_H;
    let trunkEnd = bottom;

    for (const e of kids.filter((k) => k.kind === "side")) {
      const c = pos.get(e.childId)!;
      const cy = along(e.childId, c.y, CARD_H);
      const edgeX = c.x + CARD_W / 2 >= tx ? c.x : c.x + CARD_W;
      lines.push([[tx, cy], [edgeX, cy]]);
      handles.push({
        prop: "linkOff", id: e.childId, axis: "y", x1: tx, y1: cy, x2: edgeX, y2: cy,
        origin: c.y, min: c.y + ATTACH_MARGIN, max: c.y + CARD_H - ATTACH_MARGIN,
      });
      trunkEnd = Math.max(trunkEnd, cy);
    }

    const bus = kids.filter((k) => k.kind === "bus").map((k) => ({ id: k.childId, c: pos.get(k.childId)! }));
    if (bus.length > 0) {
      const autoY = Math.max(bottom + 12, Math.min(...bus.map((b) => b.c.y)) - GAP_Y / 2);
      const y = manual.busY[parentId] ?? autoY;
      const drops = bus.map((b) => along(b.id, b.c.x, CARD_W));
      bus.forEach((b, i) => {
        lines.push([[drops[i], y], [drops[i], b.c.y]]);
        handles.push({
          prop: "linkOff", id: b.id, axis: "x", x1: drops[i], y1: y, x2: drops[i], y2: b.c.y,
          origin: b.c.x, min: b.c.x + ATTACH_MARGIN, max: b.c.x + CARD_W - ATTACH_MARGIN,
        });
      });
      const x1 = Math.min(tx, ...drops);
      const x2 = Math.max(tx, ...drops);
      lines.push([[x1, y], [x2, y]]);
      handles.push({ prop: "busY", id: parentId, axis: "y", x1, y1: y, x2, y2: y, origin: 0, min: 0, max: Infinity });
      trunkEnd = Math.max(trunkEnd, y);
    }

    if (trunkEnd > bottom) {
      lines.unshift([[tx, bottom], [tx, trunkEnd]]);
      handles.push({
        prop: "trunkX", id: parentId, axis: "x", x1: tx, y1: bottom, x2: tx, y2: trunkEnd,
        origin: p.x, min: p.x + ATTACH_MARGIN, max: p.x + CARD_W - ATTACH_MARGIN,
      });
    }
  }
  return { lines, handles };
}

/**
 * Positions every card and connector for `roots`. Cards in `manual.pos` keep
 * their saved spot; the rest use the auto layout.
 * ponytail: auto-placed newcomers can land on manually moved cards; the user drags them apart.
 */
export function layoutChart(roots: PersonNode[], manual: ManualLayout = EMPTY_MANUAL): Layout {
  const edges: Edge[] = [];
  const all: Sub = { pos: new Map(), minX: 0, maxX: 0, height: 0 };
  let x = 0;
  for (const root of roots) {
    const sub = layoutNode(root, edges);
    place(all, sub, x - sub.minX, 0);
    x += sub.maxX - sub.minX + GAP_X;
  }
  for (const [id, p] of Object.entries(manual.pos)) if (all.pos.has(id)) all.pos.set(id, p);

  const { lines, handles } = route(all.pos, edges, manual);
  const nodes = new Map<string, PersonNode>();
  const walk = (n: PersonNode) => (nodes.set(n.id, n), n.children.forEach(walk));
  roots.forEach(walk);

  const cards = [...all.pos].map(([id, p]) => ({ node: nodes.get(id)!, ...p }));
  if (cards.length === 0) return { cards, lines, handles, width: 0, height: 0 };
  const width = Math.max(...cards.map((c) => c.x + CARD_W), ...handles.map((h) => Math.max(h.x1, h.x2)));
  const height = Math.max(...cards.map((c) => c.y + CARD_H), ...handles.map((h) => Math.max(h.y1, h.y2)));
  return { cards, lines, handles, width, height };
}

export type Rect = { x1: number; y1: number; x2: number; y2: number };

/** Ids of cards touching the dragged selection box (corners in any order). */
export function cardsInRect(layout: Layout, r: Rect): string[] {
  const [l, rt] = [Math.min(r.x1, r.x2), Math.max(r.x1, r.x2)];
  const [t, b] = [Math.min(r.y1, r.y2), Math.max(r.y1, r.y2)];
  return layout.cards
    .filter((c) => c.x < rt && c.x + CARD_W > l && c.y < b && c.y + CARD_H > t)
    .map((c) => c.node.id);
}

/**
 * Moves the selected cards (and the bus lines they own) by (dx, dy), as a full
 * manual snapshot so unselected cards stay exactly where they are. The shift is
 * clamped so the selection can't go left of / above the origin. Card-relative
 * line tweaks in `manual` ride along unchanged.
 */
export function shiftSelected(layout: Layout, manual: ManualLayout, ids: Set<string>, dx: number, dy: number): ManualLayout {
  const sel = layout.cards.filter((c) => ids.has(c.node.id));
  if (sel.length === 0) return manual;
  const sx = Math.max(dx, -Math.min(...sel.map((c) => c.x)));
  const sy = Math.max(dy, -Math.min(...sel.map((c) => c.y)));
  return {
    ...manual,
    pos: Object.fromEntries(
      layout.cards.map((c) => [c.node.id, ids.has(c.node.id) ? { x: c.x + sx, y: c.y + sy } : { x: c.x, y: c.y }])
    ),
    busY: Object.fromEntries(
      layout.handles.filter((h) => h.prop === "busY").map((h) => [h.id, ids.has(h.id) ? h.y1 + sy : h.y1])
    ),
  };
}
