import { describe, expect, it } from "vitest";
import { CARD_H, CARD_W, layoutChart } from "./layout";
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
});
