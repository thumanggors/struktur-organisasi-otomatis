import { splitStaff, type PersonNode } from "./tree";

/** Fixed card size: every position is computed from it, so cards can never overlap. */
export const CARD_W = 208;
export const CARD_H = 176;

const GAP_X = 32; // between sibling subtrees
const GAP_Y = 56; // between a parent and its row of reports
const TICK = 24; // trunk-to-card connector in staff branches and leaf grids
const GRID_ROW_GAP = 16;

export type PlacedCard = { node: PersonNode; x: number; y: number };
export type Point = [number, number];
export type Layout = { cards: PlacedCard[]; lines: Point[][]; width: number; height: number };

type Sub = { cards: PlacedCard[]; lines: Point[][]; minX: number; maxX: number; height: number };

function shift(sub: Sub, dx: number, dy: number): Sub {
  return {
    cards: sub.cards.map((c) => ({ ...c, x: c.x + dx, y: c.y + dy })),
    lines: sub.lines.map((l) => l.map(([x, y]) => [x + dx, y + dy] as Point)),
    minX: sub.minX + dx,
    maxX: sub.maxX + dx,
    height: sub.height + dy,
  };
}

function merge(into: Sub, from: Sub) {
  into.cards.push(...from.cards);
  into.lines.push(...from.lines);
  into.minX = Math.min(into.minX, from.minX);
  into.maxX = Math.max(into.maxX, from.maxX);
  into.height = Math.max(into.height, from.height);
}

/**
 * Lays out a subtree with its card's top-center at (0, 0). Each child
 * subtree is packed by its full bounding box, so boxes never intersect.
 * ponytail: bounding-box packing, not contour-based (Reingold–Tilford); wastes some width on ragged trees.
 */
function layoutNode(node: PersonNode): Sub {
  const out: Sub = { cards: [{ node, x: -CARD_W / 2, y: 0 }], lines: [], minX: -CARD_W / 2, maxX: CARD_W / 2, height: CARD_H };
  const { staff, line } = splitStaff(node.children);
  let cursor = CARD_H; // lowest y used so far below the card
  let trunkEnd = CARD_H;

  // Staff (Sekretaris/Wakil) hang off the right of the trunk, above the line reports.
  for (const s of staff) {
    const sub = layoutNode(s);
    const top = cursor + GAP_Y / 2;
    const placed = shift(sub, TICK - sub.minX, top);
    const tickY = top + CARD_H / 2;
    out.lines.push([[0, tickY], [TICK, tickY]]);
    merge(out, placed);
    cursor = placed.height;
    trunkEnd = tickY;
  }

  if (line.length > 0) {
    const top = cursor + GAP_Y;
    const allLeaves = line.every((c) => c.children.length === 0);

    if (line.length > 3 && allLeaves) {
      // Two-column grid split by the trunk, each card ticked onto it.
      line.forEach((child, i) => {
        const row = Math.floor(i / 2);
        const y = top + row * (CARD_H + GRID_ROW_GAP);
        const left = i % 2 === 0;
        const x = left ? -TICK - CARD_W : TICK;
        merge(out, { cards: [{ node: child, x, y }], lines: [], minX: x, maxX: x + CARD_W, height: y + CARD_H });
        out.lines.push([[0, y + CARD_H / 2], [left ? -TICK : TICK, y + CARD_H / 2]]);
        trunkEnd = y + CARD_H / 2;
      });
    } else {
      const subs = line.map(layoutNode);
      const total = subs.reduce((w, s) => w + (s.maxX - s.minX), 0) + GAP_X * (subs.length - 1);
      const busY = top - GAP_Y / 2;
      let x = -total / 2;
      const centers: number[] = [];
      for (const sub of subs) {
        const dx = x - sub.minX;
        merge(out, shift(sub, dx, top));
        centers.push(dx);
        out.lines.push([[dx, busY], [dx, top]]);
        x += sub.maxX - sub.minX + GAP_X;
      }
      out.lines.push([[Math.min(0, ...centers), busY], [Math.max(0, ...centers), busY]]);
      trunkEnd = busY;
    }
  }

  if (trunkEnd > CARD_H) out.lines.unshift([[0, CARD_H], [0, trunkEnd]]);
  return out;
}

/** Positions every card and connector for `roots`, normalized so the top-left is (0, 0). */
export function layoutChart(roots: PersonNode[]): Layout {
  const all: Sub = { cards: [], lines: [], minX: Infinity, maxX: -Infinity, height: 0 };
  let x = 0;
  for (const root of roots) {
    const sub = layoutNode(root);
    merge(all, shift(sub, x - sub.minX, 0));
    x += sub.maxX - sub.minX + GAP_X;
  }
  if (all.cards.length === 0) return { cards: [], lines: [], width: 0, height: 0 };
  const placed = shift(all, -all.minX, 0);
  return { cards: placed.cards, lines: placed.lines, width: placed.maxX - placed.minX, height: placed.height };
}
