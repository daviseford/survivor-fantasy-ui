import { describe, expect, it } from "vitest";

// Temporary: verifies the required `ci` check blocks merges. Deleted after.
describe("required-check gate", () => {
  it("deliberately fails", () => {
    expect(1).toBe(2);
  });
});
