import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useVersionCheck } from "./useVersionCheck";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  fetchMock.mockReset();
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
  });
});

afterEach(() => {
  delete (globalThis as any).fetch;
});

describe("useVersionCheck", () => {
  it("flags an update when the remote version differs", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ version: "0.99.0" }) });

    const { result, unmount } = renderHook(() => useVersionCheck());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current.updateAvailable).toBe(true));

    expect(result.current.remoteVersion).toBe("0.99.0");
    unmount();
  });

  it("does not flag an update when the remote version matches", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ version: "0.32.2" }) });

    const { result, unmount } = renderHook(() => useVersionCheck());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current.updateAvailable).toBe(false));

    expect(result.current.remoteVersion).toBe("0.32.2");
    unmount();
  });

  it("ignores fetch failures gracefully", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));

    const { result, unmount } = renderHook(() => useVersionCheck());
    await waitFor(() => expect(result.current.remoteVersion).toBeNull());
    expect(result.current.updateAvailable).toBe(false);
    unmount();
  });
});
