import { describe, it, expect } from "vitest";
import { getMetricCount, listMetricBreakdown } from "./dashboardMockData";

describe("getMetricCount", () => {
  it("sums across all projects when no project id is given", () => {
    const totalEir = getMetricCount("eir");
    const totalEcn = getMetricCount("ecn");
    const totalBr = getMetricCount("buildRequest");
    expect(totalEir).toBeGreaterThan(0);
    expect(totalEcn).toBeGreaterThan(0);
    expect(totalBr).toBeGreaterThan(0);
  });

  it("scopes to a specific project lookupId", () => {
    // 0017-AMP-5000 Refresh = lookupId 501 — mock has higher counts here
    // for visual interest. The exact numbers don't matter; the contract is
    // that filtering returns a smaller-or-equal number than the total.
    const total = getMetricCount("ecn");
    const scoped = getMetricCount("ecn", 501);
    expect(scoped).toBeGreaterThanOrEqual(0);
    expect(scoped).toBeLessThanOrEqual(total);
  });

  it("returns 0 for unknown project ids", () => {
    expect(getMetricCount("eir", 999999)).toBe(0);
  });
});

describe("listMetricBreakdown", () => {
  it("returns one entry per mock project with a count attached", () => {
    const rows = listMetricBreakdown("buildRequest");
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.project).toHaveProperty("lookupId");
      expect(r.project).toHaveProperty("title");
      expect(typeof r.count).toBe("number");
      expect(r.count).toBeGreaterThanOrEqual(0);
    }
  });
});
