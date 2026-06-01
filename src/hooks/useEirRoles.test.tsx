import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mutable state the mocks read, flipped per test.
const state = vi.hoisted(() => ({
  enforced: true as boolean,
  user: { displayName: "Demo", email: "demo.user@altronic-llc.com" } as {
    displayName: string;
    email: string;
  },
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => state.user,
}));

// EIR_ROLES_ENFORCED is a module constant, so toggle it via a getter on the
// mocked config module (named imports are live bindings to these getters).
vi.mock("@/api/config", () => ({
  get EIR_ROLES_ENFORCED() {
    return state.enforced;
  },
  USE_MOCK: true,
  SP_SITE_ID: "site",
  SP_EIR_ROLES_LIST_ID: undefined,
  GRAPH_BASE: "https://graph.microsoft.com/v1.0",
}));

import { useMyEirRoles } from "./useEirRoles";
import type { EirRoleEntry } from "@/types/task";

const ROLES_DATA: EirRoleEntry[] = [
  { id: 1, email: "demo.user@altronic-llc.com", displayName: "Demo", roles: ["engineer", "supply chain"], note: "" },
  { id: 2, email: "eng.only@altronic-llc.com", displayName: "Eng", roles: ["engineer"], note: "" },
  { id: 3, email: "sc.only@altronic-llc.com", displayName: "SC", roles: ["supply chain"], note: "" },
];

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  // Seed fresh so the query resolves immediately without hitting the API.
  qc.setQueryData(["eir-roles", "list"], ROLES_DATA);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  state.enforced = true;
  state.user = { displayName: "Demo", email: "demo.user@altronic-llc.com" };
});

describe("useMyEirRoles", () => {
  it("returns both roles for a user tagged engineer + supply chain", () => {
    const { result } = renderHook(() => useMyEirRoles(), { wrapper: makeWrapper() });
    expect(result.current).toEqual({ isEngineer: true, isSupplyChain: true, enforced: true });
  });

  it("returns engineer only", () => {
    state.user = { displayName: "Eng", email: "eng.only@altronic-llc.com" };
    const { result } = renderHook(() => useMyEirRoles(), { wrapper: makeWrapper() });
    expect(result.current).toEqual({ isEngineer: true, isSupplyChain: false, enforced: true });
  });

  it("returns supply chain only", () => {
    state.user = { displayName: "SC", email: "sc.only@altronic-llc.com" };
    const { result } = renderHook(() => useMyEirRoles(), { wrapper: makeWrapper() });
    expect(result.current).toEqual({ isEngineer: false, isSupplyChain: true, enforced: true });
  });

  it("returns no roles for an untagged user (case-insensitive match)", () => {
    state.user = { displayName: "Eng", email: "ENG.ONLY@altronic-llc.com" };
    const { result } = renderHook(() => useMyEirRoles(), { wrapper: makeWrapper() });
    // Still matches case-insensitively.
    expect(result.current.isEngineer).toBe(true);
  });

  it("returns no roles for an unknown user", () => {
    state.user = { displayName: "Nobody", email: "nobody@altronic-llc.com" };
    const { result } = renderHook(() => useMyEirRoles(), { wrapper: makeWrapper() });
    expect(result.current).toEqual({ isEngineer: false, isSupplyChain: false, enforced: true });
  });

  it("returns no roles when the user has no email", () => {
    state.user = { displayName: "Anon", email: "" };
    const { result } = renderHook(() => useMyEirRoles(), { wrapper: makeWrapper() });
    expect(result.current).toEqual({ isEngineer: false, isSupplyChain: false, enforced: true });
  });

  it("is not enforced when the roles list is unconfigured", () => {
    state.enforced = false;
    const { result } = renderHook(() => useMyEirRoles(), { wrapper: makeWrapper() });
    expect(result.current).toEqual({ isEngineer: false, isSupplyChain: false, enforced: false });
  });
});
