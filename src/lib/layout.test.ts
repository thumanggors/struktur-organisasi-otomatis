import { describe, expect, it } from "vitest";
import { CARD_H, CARD_W, cardsInRect, layoutChart, placeNewcomers, relayoutBranch, shiftSelected, EMPTY_MANUAL } from "./layout";
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

  it("attaches a report's connector to whichever side is chosen", () => {
    const b = n("Manager");
    const root = n("Direktur", [b, n("Manager")]);
    const at = (side: "top" | "bottom" | "left" | "right") => {
      const l = layoutChart([root], { ...EMPTY_MANUAL, linkSide: { [b.id]: side } });
      const c = l.cards.find((x) => x.node.id === b.id)!;
      const ends = l.lines.map((line) => line.at(-1)!);
      return { l, c, ends };
    };

    let { l, c, ends } = at("top");
    expect(l.sides[b.id]).toBe("top");
    expect(ends).toContainEqual([c.x + CARD_W / 2, c.y]);

    ({ l, c, ends } = at("left"));
    expect(ends).toContainEqual([c.x, c.y + CARD_H / 2]);

    ({ l, c, ends } = at("right"));
    expect(ends).toContainEqual([c.x + CARD_W, c.y + CARD_H / 2]);

    ({ l, c, ends } = at("bottom"));
    expect(ends).toContainEqual([c.x + CARD_W / 2, c.y + CARD_H]);
    // the trunk reaches down to the loop under the card
    const trunk = l.handles.find((h) => h.prop === "trunkX")!;
    expect(trunk.y2).toBeGreaterThan(c.y + CARD_H);
  });

  it("defaults: line reports attach on top, staff on the side facing the trunk", () => {
    const s = n("Sekretaris");
    const m = n("Manager");
    const l = layoutChart([n("Direktur", [s, m])]);
    expect(l.sides[m.id]).toBe("top");
    expect(l.sides[s.id]).toBe("left");
  });

  it("lays every branch out horizontally, even many leaf reports", () => {
    const kids = Array.from({ length: 7 }, () => n("Permit"));
    const l = layoutChart([n("PM", kids)]);
    const ys = new Set(kids.map((k) => l.cards.find((c) => c.node.id === k.id)!.y));
    expect(ys.size).toBe(1);
  });

  it("can hang a report's connector off another person's line", () => {
    const b = n("B");
    const other = n("Other");
    const root = n("A", [b, n("C", [other])]);
    const l = layoutChart([root], { ...EMPTY_MANUAL, linkVia: { [b.id]: other.id } });
    const drop = l.handles.find((h) => h.prop === "linkOff" && h.id === b.id)!;
    expect(drop.owner).toBe(other.id);
    // Other now has its own trunk + bus even though nobody reports to it
    expect(l.handles.some((h) => h.prop === "trunkX" && h.id === other.id)).toBe(true);
    // unknown or self "via" falls back to the real boss
    const back = layoutChart([root], { ...EMPTY_MANUAL, linkVia: { [b.id]: b.id } });
    expect(back.handles.find((h) => h.prop === "linkOff" && h.id === b.id)!.owner).toBe(root.id);
  });

  it("relayoutBranch lines a branch up horizontally under its head, leaving the rest alone", () => {
    const kids = [n("P1"), n("P2"), n("P3"), n("P4")];
    const pm = n("PM", kids);
    const other = n("Other");
    const root = n("Dir", [pm, other]);
    // messy saved layout: kids stacked vertically, PM moved
    const messy = {
      ...EMPTY_MANUAL,
      pos: {
        [pm.id]: { x: 500, y: 400 },
        [other.id]: { x: 0, y: 400 },
        ...Object.fromEntries(kids.map((k, i) => [k.id, { x: 500, y: 700 + i * 200 }])),
      },
      linkSide: { [kids[0].id]: "left" as const },
    };
    const next = relayoutBranch([root], messy, pm.id);
    const l = layoutChart([root], next);
    const at = (id: string) => l.cards.find((c) => c.node.id === id)!;
    expect(at(pm.id)).toMatchObject({ x: 500, y: 400 });
    expect(at(other.id)).toMatchObject({ x: 0, y: 400 });
    expect(new Set(kids.map((k) => at(k.id).y)).size).toBe(1);
    expect(at(kids[0].id).y).toBeGreaterThan(400 + CARD_H);
    expect(next.linkSide[kids[0].id]).toBeUndefined();
  });

  const overlapping = (cards: { node: PersonNode; x: number; y: number }[]) =>
    cards.flatMap((a, i) =>
      cards
        .slice(i + 1)
        .filter((b) => a.x < b.x + CARD_W && b.x < a.x + CARD_W && a.y < b.y + CARD_H && b.y < a.y + CARD_H)
        .map((b) => `${a.node.nama}/${b.node.nama}`)
    );

  it("puts people added after a hand-arranged save into free space, never on a card", () => {
    const kids = [n("K1"), n("K2"), n("K3")];
    const boss = n("Boss", kids);
    const root = n("Dir", [boss]);
    const saved = layoutChart([root]);
    const manual = { ...EMPTY_MANUAL, pos: Object.fromEntries(saved.cards.map((c) => [c.node.id, { x: c.x, y: c.y }])) };
    // two newcomers under Boss and one under a newcomer
    const nb = n("New B", [n("New C")]);
    boss.children.push(n("New A"), nb);
    const l = layoutChart([root], placeNewcomers([root], manual));
    expect(l.cards).toHaveLength(8);
    expect(overlapping(l.cards)).toEqual([]);
    // the saved cards stayed put
    for (const c of saved.cards) expect(l.cards.find((x) => x.node.id === c.node.id)).toMatchObject({ x: c.x, y: c.y });
  });

  it("relayoutBranch moves neighbours the widened branch would cover", () => {
    const kids = Array.from({ length: 6 }, (_, i) => n(`P${i}`));
    const pm = n("PM", kids);
    const neighbour = n("Neighbour");
    const root = n("Dir", [pm, neighbour]);
    const cramped = {
      ...EMPTY_MANUAL,
      pos: {
        [root.id]: { x: 400, y: 0 },
        [pm.id]: { x: 400, y: 300 },
        [neighbour.id]: { x: 700, y: 600 }, // right where the new row will go
        ...Object.fromEntries(kids.map((k, i) => [k.id, { x: 400, y: 600 + i * 200 }])),
      },
    };
    const l = layoutChart([root], relayoutBranch([root], cramped, pm.id));
    expect(overlapping(l.cards)).toEqual([]);
  });

  it("moving one card on an unsaved (auto) chart leaves every other card where it was", () => {
    const root = n("Dir", [n("A", [n("A1"), n("A2")]), n("B", [n("B1")]), n("C")]);
    const auto = layoutChart([root]);
    const moved = auto.cards[3];
    const l = layoutChart([root], { ...EMPTY_MANUAL, pos: { [moved.node.id]: { x: moved.x + 400, y: moved.y + 96 } } });
    for (const c of auto.cards) {
      if (c.node.id === moved.node.id) continue;
      expect(l.cards.find((x) => x.node.id === c.node.id)).toMatchObject({ x: c.x, y: c.y });
    }
  });
});

