import { splitStaff, type PersonNode } from "./tree";

/** Fixed card size: every position is computed from it, so cards can never overlap. */
export const CARD_W = 208;
export const CARD_H = 176;

const GAP_X = 32; // between sibling subtrees
const GAP_Y = 56; // between a parent and its row of reports
const TICK = 24; // trunk-to-card connector in staff branches

export type Pos = { x: number; y: number };
export type Point = [number, number];
/** "side": ticked onto the parent's trunk (staff). "bus": hangs from the horizontal bus below the parent. */
export type LinkKind = "side" | "bus";
export type Edge = { parentId: string; childId: string; kind: LinkKind };
/**
 * Saved hand edits. Line tweaks are stored relative to the card they attach to,
 * so they travel with it: `trunkX` is the parent's trunk x from its card's left;
 * `linkOff` is where a report's own connector meets its card (x from the left
 * on the top/bottom side, y from the top on the left/right side). `busY` is absolute.
 */
export type Side = "top" | "bottom" | "left" | "right";
export const SIDES: Side[] = ["top", "bottom", "left", "right"];

export type ManualLayout = {
  pos: Record<string, Pos>;
  busY: Record<string, number>;
  trunkX: Record<string, number>;
  linkOff: Record<string, number>;
  /** Which side of a report's card its connector attaches to; unset = auto. */
  linkSide: Record<string, Side>;
  /** Draw a report's connector off this other person's lines instead of its boss's (visual only). */
  linkVia: Record<string, string>;
};
export const EMPTY_MANUAL: ManualLayout = { pos: {}, busY: {}, trunkX: {}, linkOff: {}, linkSide: {}, linkVia: {} };

/** A draggable line segment; dragging along `axis` sets `prop[id]` to (coordinate - origin), clamped to [min, max]. */
export type LineHandle = {
  prop: "busY" | "trunkX" | "linkOff";
  id: string;
  /** Person whose line system this segment belongs to (a drop target for "connect to this line"). */
  owner: string;
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
  /** Attach side actually used for each report's connector. */
  sides: Record<string, Side>;
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

const BELOW = 24; // how far a bottom-side connector loops under its card

/**
 * Orthogonal connectors derived from final card positions, so they always follow the cards.
 * Every report hangs off its boss's trunk: top side via the shared bus, left/right
 * via a horizontal tick (like Sekretaris), bottom via a loop under the card.
 */
function route(pos: Map<string, Pos>, edges: Edge[], manual: ManualLayout) {
  const lines: Point[][] = [];
  const handles: LineHandle[] = [];
  const sides: Record<string, Side> = {};
  // Group connectors by the person whose trunk/bus they hang off: the boss, or a chosen other line.
  const byParent = new Map<string, Edge[]>();
  for (const e of edges) {
    const via = manual.linkVia[e.childId];
    const anchor = via && via !== e.childId && pos.has(via) ? via : e.parentId;
    byParent.set(anchor, [...(byParent.get(anchor) ?? []), e]);
  }
  // Where a connector meets a card along one side of length `len`.
  const along = (id: string, start: number, len: number) =>
    start + clamp(manual.linkOff[id] ?? len / 2, ATTACH_MARGIN, len - ATTACH_MARGIN);
  const slideX = (owner: string, id: string, c: Pos, seg: [number, number, number, number]): LineHandle => ({
    prop: "linkOff", id, owner, axis: "x", x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3],
    origin: c.x, min: c.x + ATTACH_MARGIN, max: c.x + CARD_W - ATTACH_MARGIN,
  });
  const slideY = (owner: string, id: string, c: Pos, seg: [number, number, number, number]): LineHandle => ({
    prop: "linkOff", id, owner, axis: "y", x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3],
    origin: c.y, min: c.y + ATTACH_MARGIN, max: c.y + CARD_H - ATTACH_MARGIN,
  });

  for (const [parentId, kids] of byParent) {
    const p = pos.get(parentId)!;
    const tx = p.x + clamp(manual.trunkX[parentId] ?? CARD_W / 2, ATTACH_MARGIN, CARD_W - ATTACH_MARGIN);
    const bottom = p.y + CARD_H;
    let trunkEnd = bottom;
    const bus: { id: string; c: Pos }[] = [];

    for (const e of kids) {
      const id = e.childId;
      const c = pos.get(id)!;
      const auto: Side = e.kind === "bus" ? "top" : c.x + CARD_W / 2 >= tx ? "left" : "right";
      const side = (sides[id] = manual.linkSide[id] ?? auto);

      if (side === "top") {
        bus.push({ id, c });
      } else if (side === "bottom") {
        const x = along(id, c.x, CARD_W);
        const y = c.y + CARD_H + BELOW;
        lines.push([[tx, y], [x, y], [x, c.y + CARD_H]]);
        handles.push(slideX(parentId, id, c, [x, y, x, c.y + CARD_H]));
        trunkEnd = Math.max(trunkEnd, y);
      } else {
        const cy = along(id, c.y, CARD_H);
        const edgeX = side === "left" ? c.x : c.x + CARD_W;
        lines.push([[tx, cy], [edgeX, cy]]);
        handles.push(slideY(parentId, id, c, [tx, cy, edgeX, cy]));
        trunkEnd = Math.max(trunkEnd, cy);
      }
    }

    if (bus.length > 0) {
      const autoY = Math.max(bottom + 12, Math.min(...bus.map((b) => b.c.y)) - GAP_Y / 2);
      const y = manual.busY[parentId] ?? autoY;
      const drops = bus.map((b) => along(b.id, b.c.x, CARD_W));
      bus.forEach((b, i) => {
        lines.push([[drops[i], y], [drops[i], b.c.y]]);
        handles.push(slideX(parentId, b.id, b.c, [drops[i], y, drops[i], b.c.y]));
      });
      const x1 = Math.min(tx, ...drops);
      const x2 = Math.max(tx, ...drops);
      lines.push([[x1, y], [x2, y]]);
      handles.push({ prop: "busY", id: parentId, owner: parentId, axis: "y", x1, y1: y, x2, y2: y, origin: 0, min: 0, max: Infinity });
      trunkEnd = Math.max(trunkEnd, y);
    }

    if (trunkEnd > bottom) {
      lines.unshift([[tx, bottom], [tx, trunkEnd]]);
      handles.push({
        prop: "trunkX", id: parentId, owner: parentId, axis: "x", x1: tx, y1: bottom, x2: tx, y2: trunkEnd,
        origin: p.x, min: p.x + ATTACH_MARGIN, max: p.x + CARD_W - ATTACH_MARGIN,
      });
    }
  }
  return { lines, handles, sides };
}

const CLEARANCE = 16; // minimum gap kept between cards when finding free space

const collides = (p: Pos, others: Iterable<Pos>) => {
  for (const o of others)
    if (
      p.x < o.x + CARD_W + CLEARANCE &&
      o.x < p.x + CARD_W + CLEARANCE &&
      p.y < o.y + CARD_H + CLEARANCE &&
      o.y < p.y + CARD_H + CLEARANCE
    )
      return true;
  return false;
};

/**
 * Nearest free card slot to `start`: scans rows downward, and in each row
 * alternates right/left of `start`. The chart grows to fit whatever it picks.
 * ponytail: O(slots x cards) scan; fine for a few hundred people.
 */
export function freeSlot(start: Pos, others: Pos[]): Pos {
  const stepX = CARD_W + GAP_X, stepY = CARD_H + GAP_Y;
  for (let r = 0; r < 60; r++)
    for (let k = 0; k <= 40; k++)
      for (const dir of k === 0 ? [0] : [1, -1]) {
        const p = { x: start.x + dir * k * stepX, y: start.y + r * stepY };
        if (p.x >= 0 && p.y >= 0 && !collides(p, others)) return p;
      }
  // Everything nearby is taken: go below the lowest card.
  return { x: Math.max(0, start.x), y: Math.max(0, ...others.map((o) => o.y + stepY)) };
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

  // In a hand-arranged chart, people without a saved spot (newly added) go in the
  // nearest free slot below their boss, so they never land on an existing card.
  const placed = new Set(Object.keys(manual.pos).filter((id) => all.pos.has(id)));
  if (placed.size > 0) {
    const bossOf = new Map(edges.map((e) => [e.childId, e.parentId]));
    for (const [id, autoPos] of all.pos) {
      if (placed.has(id)) continue;
      const boss = bossOf.get(id);
      const b = boss && all.pos.get(boss);
      const start = b ? { x: b.x, y: b.y + CARD_H + GAP_Y } : autoPos;
      all.pos.set(id, freeSlot(start, [...placed].map((pid) => all.pos.get(pid)!)));
      placed.add(id);
    }
  }

  const { lines, handles, sides } = route(all.pos, edges, manual);
  const nodes = new Map<string, PersonNode>();
  const walk = (n: PersonNode) => (nodes.set(n.id, n), n.children.forEach(walk));
  roots.forEach(walk);

  const cards = [...all.pos].map(([id, p]) => ({ node: nodes.get(id)!, ...p }));
  if (cards.length === 0) return { cards, lines, handles, sides, width: 0, height: 0 };
  const width = Math.max(...cards.map((c) => c.x + CARD_W), ...handles.map((h) => Math.max(h.x1, h.x2)));
  const height = Math.max(...cards.map((c) => c.y + CARD_H), ...handles.map((h) => Math.max(h.y1, h.y2)));
  return { cards, lines, handles, sides, width, height };
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

/**
 * Re-applies the auto layout (horizontal rows) to everyone under `id`, keeping
 * `id` itself where it is. Line tweaks inside that branch are cleared; the rest
 * of the chart is untouched.
 * ponytail: the rebuilt branch can overlap neighbours; the user drags it clear.
 */
export function relayoutBranch(roots: PersonNode[], manual: ManualLayout, id: string): ManualLayout {
  const find = (ns: PersonNode[]): PersonNode | undefined => {
    for (const n of ns) {
      if (n.id === id) return n;
      const hit = find(n.children);
      if (hit) return hit;
    }
  };
  const node = find(roots);
  if (!node || node.children.length === 0) return manual;

  const anchor = layoutChart(roots, manual).cards.find((c) => c.node.id === id)!;
  const sub = layoutNode(node, []);
  const dx = anchor.x + CARD_W / 2;
  const next: ManualLayout = {
    pos: { ...manual.pos },
    busY: { ...manual.busY },
    trunkX: { ...manual.trunkX },
    linkOff: { ...manual.linkOff },
    linkSide: { ...manual.linkSide },
    linkVia: { ...manual.linkVia },
  };
  delete next.busY[id];
  delete next.trunkX[id];
  for (const [pid, p] of sub.pos) {
    if (pid === id) continue;
    next.pos[pid] = { x: p.x + dx, y: p.y + anchor.y };
    for (const k of ["busY", "trunkX", "linkOff", "linkSide", "linkVia"] as const) delete next[k][pid];
  }

  // Cards outside the branch that the rebuilt branch now covers move to the nearest free slot.
  const current = layoutChart(roots, next);
  const taken: Pos[] = [...sub.pos.keys()].map((pid) =>
    pid === id ? { x: anchor.x, y: anchor.y } : next.pos[pid]
  );
  const outsiders = current.cards.filter((c) => !sub.pos.has(c.node.id));
  const hit = outsiders.filter((c) => collides(c, taken));
  for (const c of outsiders) {
    if (hit.includes(c)) continue;
    next.pos[c.node.id] = { x: c.x, y: c.y };
    taken.push(c);
  }
  for (const c of hit) taken.push((next.pos[c.node.id] = freeSlot(c, taken)));
  return next;
}
