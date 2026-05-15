// Sanity test — verifies Vitest is wired up. Remove or repurpose once real
// tests exist; right now it exists so `npm run test` produces a green
// signal on a fresh clone.

import { describe, it, expect } from "vitest";

describe("test infrastructure", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });

  it("loads jsdom for DOM globals", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });
});
