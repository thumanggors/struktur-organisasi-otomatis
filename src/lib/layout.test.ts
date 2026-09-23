import { describe, expect, it } from "vitest";
import { CARD_H, CARD_W, cardsInRect, layoutChart, shiftSelected, EMPTY_MANUAL } from "./layout";
import type { PersonNode } from "./tree";

let seq = 0;
function n(jabatan: string, children: PersonNode[] = []): PersonNode {
  seq++;
  return { id: `p${seq}`, nama: `P${seq}`, jabatan, divisi: null, jobdesk: null, fotoUrl: null, children };
}

function overlaps(roots: PersonNode[]) {
  const { cards } = layoutChart(roots);
  const hits: string[] = [];
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j];
      if (a.x < b.x + CARD_W && b.x < a.x + CARD_W && a.y < b.y + CARD_H && b.y < a.y + CARD_H)
        hits.push(`${a.node.id}/${b.node.id}`);
    }
  return hits;
}

describe("layoutChart", () => {
  it("places every node exactly once", () => {
    const roots = [n("Direktur", [n("Manager", [n("Staff"), n("Staff")]), n("Manager")])];
    expect(layoutChart(roots).cards).toHaveLength(5);
  });

  it("never overlaps cards: staff branches, leaf grids, deep and wide trees, multiple roots", () => {
    const leaves = (k: number) => Array.from({ length: k }, () => n("PMO"));
    const roots = [
      n("Komisaris", [
        n("Direktur Utama", [
          n("Sekretaris"),
          n("Wakil Direktur", [n("Staff"), n("Staff")]),
          n("Direktur", [n("Sekretaris"), n("Manager", leaves(7)), n("Manager", leaves(2)), n("Manager", leaves(5))]),
          n("Direktur", [n("Manager", leaves(4)), n("Manager", [n("SPV", leaves(6)), n("SPV", leaves(1))])]),
        ]),
      ]),
      n("Pengawas", leaves(9)),
    ];
    expect(overlaps(roots)).toEqual([]);
  });

  it("starts at the origin", () => {
    const { cards, width } = layoutChart([n("A", [n("B"), n("C")])]);
    expect(Math.min(...cards.map((c) => c.x))).toBe(0);
    expect(width).toBeGreaterThanOrEqual(2 * CARD_W);
  });

  it("keeps manually placed cards and routes lines to them", () => {
    const b = n("B");
    const root = n("A", [b, n("C")]);
    const { cards, lines } = layoutChart([root], { ...EMPTY_MANUAL, pos: { [b.id]: { x: 1000, y: 700 } } });
    expect(cards.find((c) => c.node.id === b.id)).toMatchObject({ x: 1000, y: 700 });
    // a drop line lands on B's top-center
    expect(lines.some((l) => l.at(-1)![0] === 1000 + CARD_W / 2 && l.at(-1)![1] === 700)).toBe(true);
  });

  it("uses a saved bus height for that parent", () => {
    const root = n("A", [n("B"), n("C")]);
    const { handles } = layoutChart([root], { ...EMPTY_MANUAL, busY: { [root.id]: 222 } });
    expect(handles.filter((h) => h.prop === "busY")).toEqual([expect.objectContaining({ id: root.id, y1: 222 })]);
  });

  it("cardsInRect picks only cards touching the box, whichever way it was dragged", () => {
    const b = n("B"), c = n("C");
    const layout = layoutChart([n("A", [b, c])]);
    const cb = layout.cards.find((x) => x.node.id === b.id)!;
    // box dragged bottom-right to top-left around B only
    expect(cardsInRect(layout, { x1: cb.x + 10, y1: cb.y + 10, x2: cb.x - 5, y2: cb.y - 5 })).toEqual([b.id]);
  });

  it("shiftSelected moves only the selection and the bus lines it owns", () => {
    const b = n("B", [n("D"), n("E")]);
    const root = n("A", [b, n("C")]);
    const base = layoutChart([root]);
    const moved = layoutChart([root], shiftSelected(base, EMPTY_MANUAL, new Set([b.id]), 40, 16));
    for (const c of base.cards) {
      const m = moved.cards.find((x) => x.node.id === c.node.id)!;
      expect(m).toMatchObject(c.node.id === b.id ? { x: c.x + 40, y: c.y + 16 } : { x: c.x, y: c.y });
    }
    const busOf = (l: typeof base, id: string) => l.handles.find((h) => h.prop === "busY" && h.id === id)!.y1;
    expect(busOf(moved, b.id)).toBe(busOf(base, b.id) + 16);
    expect(busOf(moved, root.id)).toBe(busOf(base, root.id));
    // clamped at the origin
    const clamped = layoutChart([root], shiftSelected(base, EMPTY_MANUAL, new Set([root.id]), 0, -9999));
    expect(clamped.cards.find((x) => x.node.id === root.id)!.y).toBe(0);
  });

  it("line tweaks are card-relative, clamped inside the card, and follow a moved card", () => {
    const b = n("B"), c = n("C");
    const root = n("A", [b, c]);
    const manual = { ...EMPTY_MANUAL, trunkX: { [root.id]: 40 }, linkOff: { [b.id]: 9999 } };
    const l = layoutChart([root], manual);
    const card = (id: string) => l.cards.find((x) => x.node.id === id)!;
    const trunk = l.handles.find((h) => h.prop === "trunkX")!;
    expect(trunk.x1).toBe(card(root.id).x + 40);
    const drop = l.handles.find((h) => h.prop === "linkOff" && h.id === b.id)!;
    expect(drop.x1).toBe(card(b.id).x + CARD_W - 16); // clamped to the card edge margin
    expect(drop.y2).toBe(card(b.id).y); // still lands on B's top

    const moved = layoutChart([root], { ...manual, pos: { [b.id]: { x: 900, y: 600 } } });
    expect(moved.handles.find((h) => h.prop === "linkOff" && h.id === b.id)!.x1).toBe(900 + CARD_W - 16);
  });

  it("side ticks move along the card's height", () => {
    const s = n("Sekretaris");
    const root = n("Direktur", [s]);
    const l = layoutChart([root], { ...EMPTY_MANUAL, linkOff: { [s.id]: 30 } });
    const tick = l.handles.find((h) => h.id === s.id)!;
    expect(tick.axis).toBe("y");
    expect(tick.y1).toBe(l.cards.find((x) => x.node.id === s.id)!.y + 30);
  });
});
