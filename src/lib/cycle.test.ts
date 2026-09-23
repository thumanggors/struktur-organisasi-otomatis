import { describe, expect, it } from "vitest";
import { wouldCreateCycle } from "./cycle";

const people = [
  { id: "a", atasanId: null },
  { id: "b", atasanId: "a" },
  { id: "c", atasanId: "b" },
];

describe("wouldCreateCycle", () => {
  it("allows setting no atasan", () => {
    expect(wouldCreateCycle("a", null, people)).toBe(false);
  });

  it("allows a valid non-cyclic assignment", () => {
    expect(wouldCreateCycle("c", "a", people)).toBe(false);
  });

  it("rejects a person becoming their own atasan", () => {
    expect(wouldCreateCycle("a", "a", people)).toBe(true);
  });

  it("rejects an indirect cycle (c is a's ancestor via b)", () => {
    expect(wouldCreateCycle("a", "c", people)).toBe(true);
  });
});
