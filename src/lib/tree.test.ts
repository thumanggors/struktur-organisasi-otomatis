import { describe, expect, it } from "vitest";
import { buildTree, isStaffPosition, listDivisi, splitStaff, withAncestors, type Person, type PersonNode } from "./tree";

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

describe("withAncestors", () => {
  const marketing: Person = {
    id: "m",
    nama: "Mona",
    jabatan: "Staff",
    divisi: "Marketing",
    jobdesk: null,
    fotoUrl: null,
    atasanId: "a",
  };

  it("includes a divisi member and every ancestor up to the root", () => {
    const result = withAncestors(people, "Ops");
    expect(result.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("excludes people from a different divisi and their exclusive ancestors", () => {
    const result = withAncestors([...people, marketing], "Marketing");
    expect(result.map((p) => p.id).sort()).toEqual(["a", "m"]);
  });

  it("returns an empty array when no one matches the divisi", () => {
    expect(withAncestors(people, "Finance")).toEqual([]);
  });
});

describe("listDivisi", () => {
  it("returns distinct, sorted, non-null divisi values", () => {
    const withDupes: Person[] = [
      ...people,
      { id: "e", nama: "Eve", jabatan: "Staff", divisi: "Ops", jobdesk: null, fotoUrl: null, atasanId: null },
      { id: "f", nama: "Finn", jabatan: "Staff", divisi: null, jobdesk: null, fotoUrl: null, atasanId: null },
    ];
    expect(listDivisi(withDupes)).toEqual(["Ops"]);
  });

  it("returns an empty array when no one has a divisi", () => {
    const noDivisi: Person[] = [{ id: "a", nama: "A", jabatan: "X", divisi: null, jobdesk: null, fotoUrl: null, atasanId: null }];
    expect(listDivisi(noDivisi)).toEqual([]);
  });
});

describe("isStaffPosition", () => {
  it("matches Wakil Direktur and Sekretaris, case-insensitively", () => {
    expect(isStaffPosition("Wakil Direktur")).toBe(true);
    expect(isStaffPosition("wakil direktur utama")).toBe(true);
    expect(isStaffPosition("SEKRETARIS")).toBe(true);
    expect(isStaffPosition("Sekretaris Direktur")).toBe(true);
  });

  it("does not match ordinary positions", () => {
    expect(isStaffPosition("Direktur")).toBe(false);
    expect(isStaffPosition("Manager")).toBe(false);
    expect(isStaffPosition("Staff")).toBe(false);
  });
});

describe("splitStaff", () => {
  const children: PersonNode[] = [
    { id: "1", nama: "A", jabatan: "Wakil Direktur", divisi: null, jobdesk: null, fotoUrl: null, children: [] },
    { id: "2", nama: "B", jabatan: "Sekretaris", divisi: null, jobdesk: null, fotoUrl: null, children: [] },
    { id: "3", nama: "C", jabatan: "Manager", divisi: null, jobdesk: null, fotoUrl: null, children: [] },
  ];

  it("separates staff positions from regular line reports", () => {
    const { staff, line } = splitStaff(children);
    expect(staff.map((p) => p.id)).toEqual(["1", "2"]);
    expect(line.map((p) => p.id)).toEqual(["3"]);
  });

  it("returns empty arrays for no children", () => {
    expect(splitStaff([])).toEqual({ staff: [], line: [] });
  });
});
