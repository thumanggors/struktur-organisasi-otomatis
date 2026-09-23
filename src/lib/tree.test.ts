import { describe, expect, it } from "vitest";
import { buildTree, type Person } from "./tree";

const people: Person[] = [
  { id: "a", nama: "Alice", jabatan: "Direktur", divisi: null, jobdesk: null, fotoUrl: null, atasanId: null },
  { id: "b", nama: "Bob", jabatan: "Manager", divisi: "Ops", jobdesk: null, fotoUrl: null, atasanId: "a" },
  { id: "c", nama: "Cara", jabatan: "Staff", divisi: "Ops", jobdesk: null, fotoUrl: null, atasanId: "b" },
];

describe("buildTree", () => {
  it("nests children under their atasan", () => {
    const tree = buildTree(people);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("a");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe("b");
    expect(tree[0].children[0].children[0].id).toBe("c");
  });

  it("treats a missing/unknown atasanId as a root", () => {
    const orphan: Person = { id: "d", nama: "Dana", jabatan: "Staff", divisi: null, jobdesk: null, fotoUrl: null, atasanId: "does-not-exist" };
    const tree = buildTree([...people, orphan]);
    expect(tree.map((n) => n.id)).toContain("d");
  });

  it("returns an empty array for no people", () => {
    expect(buildTree([])).toEqual([]);
  });
});
