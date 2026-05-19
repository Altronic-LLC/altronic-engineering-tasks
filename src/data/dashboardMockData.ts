import { MOCK_PROJECTS } from "./mockData";

// =============================================================================
// Dashboard mock data for the three "future" SharePoint lists that don't
// exist yet — Engineering Information Requests (EIRs), Engineering Change
// Notices (ECNs), and Build Requests. We render counts on the dashboard so
// users can see what the workspace WILL look like; the underlying numbers
// here are made up.
//
// When each list gets implemented for real, replace these counts with calls
// into a proper hook (useEirs, useEcns, useBuildRequests). The dashboard
// component reads from getEirCount() etc. so swapping in real data is a
// one-file change — the UI doesn't need to know about the migration.
// =============================================================================

export type MetricKind = "eir" | "ecn" | "buildRequest";

/**
 * Per-project mock counts. Keyed by project lookupId so we can pretend the
 * data is filterable. Numbers chosen to be plausible — nothing exact.
 */
const MOCK_COUNTS: Record<MetricKind, Record<number, number>> = {
  eir: {
    274: 4, // 0000-Engineering Apps
    412: 1, // 0003-Engineering Task List
    501: 7, // 0017-AMP-5000 Refresh
    522: 3, // 0021-CleanBurn Telemetry
    530: 0, // 0030-Field Trial Tooling
  },
  ecn: {
    274: 2,
    412: 0,
    501: 11,
    522: 4,
    530: 1,
  },
  buildRequest: {
    274: 1,
    412: 0,
    501: 6,
    522: 2,
    530: 3,
  },
};

/** Total count across all projects, or just one if a projectLookupId is passed. */
export function getMetricCount(
  kind: MetricKind,
  projectLookupId: number | null = null,
): number {
  const byProject = MOCK_COUNTS[kind];
  if (projectLookupId != null) {
    return byProject[projectLookupId] ?? 0;
  }
  return Object.values(byProject).reduce((sum, n) => sum + n, 0);
}

/** Suitable for sanity-checking that the mock projects + counts agree. */
export function listMetricBreakdown(kind: MetricKind) {
  return MOCK_PROJECTS.map((p) => ({
    project: p,
    count: MOCK_COUNTS[kind][p.lookupId] ?? 0,
  }));
}
