import { describe, expect, it } from "vitest";
import { divisiColor } from "./divisiColor";

describe("divisiColor", () => {
  it("is deterministic for the same name", () => {
    expect(divisiColor("Marketing")).toBe(divisiColor("Marketing"));
  });

  it("returns a full color set with badge/solid/border classes", () => {
    const c = divisiColor("Finance");
    expect(c.badge).toMatch(/^bg-\S+ text-\S+$/);
    expect(c.solid).toMatch(/^bg-\S+$/);
    expect(c.border).toMatch(/^border-\S+$/);
  });

  it("handles an empty string without throwing", () => {
    expect(() => divisiColor("")).not.toThrow();
  });
});
