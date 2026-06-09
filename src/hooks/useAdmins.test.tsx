import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  email: "demo.user@altronic-llc.com",
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ displayName: "U", email: mocks.email, lookupId: 0 }),
}));
vi.mock("@/api/admins", () => ({
  listAdmins: vi.fn().mockResolvedValue([]),
  addAdmin: vi.fn().mockResolvedValue({ id: 5, email: "x", displayName: "", note: "" }),
  removeAdmin: vi.fn().mockResolvedValue(undefined),
}));

import { useAddAdmin, useRemoveAdmin } from "./useAdmins";
import { addAdmin, removeAdmin } from "@/api/admins";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.email = "demo.user@altronic-llc.com"; // bootstrap admin
});

describe("useAdmins mutation guards", () => {
  it("lets a bootstrap admin add an admin", async () => {
    const { result } = renderHook(() => useAddAdmin(), { wrapper });
    await result.current.mutateAsync({ email: "a@b.com", displayName: "", note: "" });
    expect(addAdmin as Mock).toHaveBeenCalled();
  });

  it("blocks a non-admin from adding an admin", async () => {
    mocks.email = "random.person@altronic-llc.com";
    const { result } = renderHook(() => useAddAdmin(), { wrapper });
    await expect(
      result.current.mutateAsync({ email: "a@b.com", displayName: "", note: "" }),
    ).rejects.toThrow(/Only admins/i);
    expect(addAdmin as Mock).not.toHaveBeenCalled();
  });

  it("blocks a non-admin from removing an admin", async () => {
    mocks.email = "random.person@altronic-llc.com";
    const { result } = renderHook(() => useRemoveAdmin(), { wrapper });
    await expect(result.current.mutateAsync(3)).rejects.toThrow(/Only admins/i);
    expect(removeAdmin as Mock).not.toHaveBeenCalled();
  });
});
