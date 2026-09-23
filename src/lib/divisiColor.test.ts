import { describe, expect, it } from "vitest";
import { divisiColorFor, divisiColorMap } from "./divisiColor";

describe("divisiColorMap", () => {
  it("gives every division a distinct color up to the palette size", () => {
    const divisions = ["Finance", "HR", "Operations", "Marketing", "Sales", "IT", "Legal", "Procurement", "R&D", "CS"];
    const map = divisiColorMap(divisions);
    const solids = divisions.map((d) => map[d].solid);
    expect(new Set(solids).size).toBe(divisions.length);
  });

  it("is stable for the same input order", () => {
    const divisions = ["Finance", "HR"];
    expect(divisiColorMap(divisions).Finance).toBe(divisiColorMap(divisions).Finance);
  });

  it("returns an empty map for no divisions", () => {
    expect(Object.keys(divisiColorMap([]))).toHaveLength(0);
  });
});

describe("divisiColorFor", () => {
  it("returns a full color set for a mapped divisi", () => {
    const map = divisiColorMap(["Finance"]);
    const c = divisiColorFor(map, "Finance");
    expect(c.badge).toMatch(/^bg-\S+ text-\S+$/);
    expect(c.solid).toMatch(/^bg-\S+$/);
    expect(c.border).toMatch(/^border-\S+$/);
  });

  it("falls back to a neutral color for an unmapped divisi", () => {
    const map = divisiColorMap(["Finance"]);
    expect(divisiColorFor(map, "Unknown").solid).toBe("bg-slate-600");
  });
});
