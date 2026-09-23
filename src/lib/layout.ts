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
export type ManualLayout = { pos: Record<string, Pos>; busY: Record<string, number> };
export type Layout = {
  cards: { node: PersonNode; x: number; y: number }[];
  lines: Point[][];
  /** Draggable bus segments: y plus the x-span, keyed by parent id. */
  buses: { parentId: string; y: number; x1: number; x2: number }[];
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

/** Orthogonal connectors derived from final card positions, so they always follow the cards. */
function route(pos: Map<string, Pos>, edges: Edge[], busOverride: Record<string, number>) {
  const lines: Point[][] = [];
  const buses: Layout["buses"] = [];
  const byParent = new Map<string, Edge[]>();
  for (const e of edges) byParent.set(e.parentId, [...(byParent.get(e.parentId) ?? []), e]);

  for (const [parentId, kids] of byParent) {
    const p = pos.get(parentId)!;
    const tx = p.x + CARD_W / 2; // trunk x
    const bottom = p.y + CARD_H;
    let trunkEnd = bottom;

    for (const e of kids.filter((k) => k.kind === "side")) {
      const c = pos.get(e.childId)!;
      const cy = c.y + CARD_H / 2;
      const edgeX = c.x + CARD_W / 2 >= tx ? c.x : c.x + CARD_W;
      lines.push([[tx, cy], [edgeX, cy]]);
      trunkEnd = Math.max(trunkEnd, cy);
    }

    const bus = kids.filter((k) => k.kind === "bus").map((k) => pos.get(k.childId)!);
    if (bus.length > 0) {
      const autoY = Math.max(bottom + 12, Math.min(...bus.map((c) => c.y)) - GAP_Y / 2);
      const y = busOverride[parentId] ?? autoY;
      const centers = bus.map((c) => c.x + CARD_W / 2);
      const x1 = Math.min(tx, ...centers);
      const x2 = Math.max(tx, ...centers);
      for (const c of bus) lines.push([[c.x + CARD_W / 2, y], [c.x + CARD_W / 2, c.y]]);
      lines.push([[x1, y], [x2, y]]);
      buses.push({ parentId, y, x1, x2 });
      trunkEnd = Math.max(trunkEnd, y);
    }

    if (trunkEnd > bottom) lines.unshift([[tx, bottom], [tx, trunkEnd]]);
  }
  return { lines, buses };
}

/**
 * Positions every card and connector for `roots`. Cards in `manual.pos` keep
 * their saved spot; the rest use the auto layout.
 * ponytail: auto-placed newcomers can land on manually moved cards; the user drags them apart.
 */
export function layoutChart(roots: PersonNode[], manual: ManualLayout = { pos: {}, busY: {} }): Layout {
  const edges: Edge[] = [];
  const all: Sub = { pos: new Map(), minX: 0, maxX: 0, height: 0 };
  let x = 0;
  for (const root of roots) {
    const sub = layoutNode(root, edges);
    place(all, sub, x - sub.minX, 0);
    x += sub.maxX - sub.minX + GAP_X;
  }
  for (const [id, p] of Object.entries(manual.pos)) if (all.pos.has(id)) all.pos.set(id, p);

  const { lines, buses } = route(all.pos, edges, manual.busY);
  const nodes = new Map<string, PersonNode>();
  const walk = (n: PersonNode) => (nodes.set(n.id, n), n.children.forEach(walk));
  roots.forEach(walk);

  const cards = [...all.pos].map(([id, p]) => ({ node: nodes.get(id)!, ...p }));
  if (cards.length === 0) return { cards, lines, buses, width: 0, height: 0 };
  const width = Math.max(...cards.map((c) => c.x + CARD_W), ...buses.map((b) => b.x2));
  const height = Math.max(...cards.map((c) => c.y + CARD_H), ...buses.map((b) => b.y));
  return { cards, lines, buses, width, height };
}
