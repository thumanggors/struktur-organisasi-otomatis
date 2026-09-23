import { describe, expect, it } from "vitest";
import { CARD_H, CARD_W, layoutChart, shiftAll } from "./layout";
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
    const { cards, lines } = layoutChart([root], { pos: { [b.id]: { x: 1000, y: 700 } }, busY: {} });
    expect(cards.find((c) => c.node.id === b.id)).toMatchObject({ x: 1000, y: 700 });
    // a drop line lands on B's top-center
    expect(lines.some((l) => l.at(-1)![0] === 1000 + CARD_W / 2 && l.at(-1)![1] === 700)).toBe(true);
  });

  it("uses a saved bus height for that parent", () => {
    const root = n("A", [n("B"), n("C")]);
    const { buses } = layoutChart([root], { pos: {}, busY: { [root.id]: 222 } });
    expect(buses).toEqual([expect.objectContaining({ parentId: root.id, y: 222 })]);
  });

  it("shiftAll moves cards and bus lines together, clamped at the origin", () => {
    const root = n("A", [n("B"), n("C")]);
    const base = layoutChart([root]);
    const moved = layoutChart([root], shiftAll(base, 40, 16));
    base.cards.forEach((c, i) => expect(moved.cards[i]).toMatchObject({ x: c.x + 40, y: c.y + 16 }));
    expect(moved.buses[0].y).toBe(base.buses[0].y + 16);
    // can't push past the top-left corner
    const clamped = layoutChart([root], shiftAll(base, -9999, -9999));
    expect(Math.min(...clamped.cards.map((c) => c.x))).toBe(0);
    expect(Math.min(...clamped.cards.map((c) => c.y))).toBe(0);
  });
});

