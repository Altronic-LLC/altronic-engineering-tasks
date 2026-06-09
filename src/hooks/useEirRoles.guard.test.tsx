import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({ isAdmin: true }));

vi.mock("./useIsAdmin", () => ({ useIsAdmin: () => mocks.isAdmin }));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ displayName: "U", email: "u@altronic-llc.com", lookupId: 0 }),
}));
vi.mock("@/api/eirRoles", () => ({
  listEirRoles: vi.fn().mockResolvedValue([]),
  addEirRole: vi.fn().mockResolvedValue({ id: 1 }),
  updateEirRole: vi.fn().mockResolvedValue({ id: 1 }),
  removeEirRole: vi.fn().mockResolvedValue(undefined),
}));

import { useAddEirRole, useUpdateEirRole, useRemoveEirRole } from "./useEirRoles";
import { addEirRole, updateEirRole, removeEirRole } from "@/api/eirRoles";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAdmin = true;
});

describe("useEirRoles mutation guards", () => {
  it("lets an admin add / update / remove a role entry", async () => {
    const add = renderHook(() => useAddEirRole(), { wrapper });
    await add.result.current.mutateAsync({ email: "e@x.com", displayName: "", roles: [], note: "" });
    expect(addEirRole as Mock).toHaveBeenCalled();

    const upd = renderHook(() => useUpdateEirRole(), { wrapper });
    await upd.result.current.mutateAsync({ id: 1, roles: ["engineer"] });
    expect(updateEirRole as Mock).toHaveBeenCalled();

    const rem = renderHook(() => useRemoveEirRole(), { wrapper });
    await rem.result.current.mutateAsync(1);
    expect(removeEirRole as Mock).toHaveBeenCalled();
  });

  it("blocks a non-admin from add / update / remove", async () => {
    mocks.isAdmin = false;

    const add = renderHook(() => useAddEirRole(), { wrapper });
    await expect(
      add.result.current.mutateAsync({ email: "e@x.com", displayName: "", roles: [], note: "" }),
    ).rejects.toThrow(/Only admins/i);

    const upd = renderHook(() => useUpdateEirRole(), { wrapper });
    await expect(upd.result.current.mutateAsync({ id: 1, roles: ["engineer"] })).rejects.toThrow(
      /Only admins/i,
    );

    const rem = renderHook(() => useRemoveEirRole(), { wrapper });
    await expect(rem.result.current.mutateAsync(1)).rejects.toThrow(/Only admins/i);

    expect(addEirRole as Mock).not.toHaveBeenCalled();
    expect(updateEirRole as Mock).not.toHaveBeenCalled();
    expect(removeEirRole as Mock).not.toHaveBeenCalled();
  });
});
