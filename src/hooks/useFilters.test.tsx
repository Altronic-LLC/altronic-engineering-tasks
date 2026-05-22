import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useFilters } from "./useFilters";

// Mock useCurrentUser so we can control what email "the signed-in user" has
// without standing up MSAL. The hook only reads `me.email`.
const mockUser = vi.hoisted(() => ({
  email: "me@example.com",
  displayName: "Test User",
  lookupId: 0,
}));
vi.mock("./useCurrentUser", () => ({
  useCurrentUser: () => mockUser,
}));

beforeEach(() => {
  mockUser.email = "me@example.com";
});

function wrapperFor(initialPath: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

/** Helper: read filters + current URL search portion from inside the router. */
function useFiltersAndLocation() {
  const [filters, setFilters] = useFilters();
  const location = useLocation();
  return { filters, setFilters, search: location.search };
}

describe("useFilters — first-visit default", () => {
  it("fills assigned with the current user when URL has no assigned param", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/"),
    });
    rerender();
    expect(result.current.filters.assignedEmails).toEqual(["me@example.com"]);
    expect(result.current.search).toContain("assigned=me%40example.com");
  });

  it("does NOT default when URL already has assigned=someone", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=other@x.com"),
    });
    expect(result.current.filters.assignedEmails).toEqual(["other@x.com"]);
  });

  it("respects explicit 'Anyone' (?assigned= empty) — no re-default", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned="),
    });
    rerender();
    expect(result.current.filters.assignedEmails).toEqual([]);
    expect(result.current.search).toContain("assigned=");
  });

  it("waits for current user email — does not default if email is empty", () => {
    mockUser.email = "";
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/"),
    });
    rerender();
    expect(result.current.filters.assignedEmails).toEqual([]);
    expect(result.current.search).toBe("");
  });
});

describe("useFilters — parsing comma-separated lists", () => {
  it("parses multi-value assigned", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=alice@x.com,bob@x.com"),
    });
    expect(result.current.filters.assignedEmails).toEqual(["alice@x.com", "bob@x.com"]);
  });

  it("parses multi-value project ids", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&project=10,20,30"),
    });
    expect(result.current.filters.projectIds).toEqual([10, 20, 30]);
  });

  it("filters out non-integer entries in project list", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&project=10,abc,30"),
    });
    expect(result.current.filters.projectIds).toEqual([10, 30]);
  });

  it("returns empty arrays when params absent", () => {
    mockUser.email = "";
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/"),
    });
    expect(result.current.filters.projectIds).toEqual([]);
    expect(result.current.filters.assignedEmails).toEqual([]);
  });

  it("parses q into search", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&q=hello%20world"),
    });
    expect(result.current.filters.search).toBe("hello world");
  });

  it("parses createdBy", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&createdBy=alice@x.com"),
    });
    expect(result.current.filters.createdByEmail).toBe("alice@x.com");
  });
});

describe("useFilters — setFilters writes back", () => {
  it("writes comma-joined arrays to URL", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x"),
    });
    act(() => {
      result.current.setFilters({
        search: "foo",
        projectIds: [10, 20],
        assignedEmails: ["alice@x.com", "bob@x.com"],
        createdByEmail: "carol@x.com",
      });
    });
    rerender();
    expect(result.current.search).toContain("q=foo");
    expect(result.current.search).toContain("project=10%2C20");
    expect(result.current.search).toContain("assigned=alice%40x.com%2Cbob%40x.com");
    expect(result.current.search).toContain("createdBy=carol%40x.com");
  });

  it("removes optional params when arrays are empty / values null", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&q=foo&project=10&createdBy=bob@x.com"),
    });
    act(() => {
      result.current.setFilters({
        search: "",
        projectIds: [],
        assignedEmails: ["alice@x.com"],
        createdByEmail: null,
      });
    });
    rerender();
    expect(result.current.search).not.toContain("q=");
    expect(result.current.search).not.toContain("project=");
    expect(result.current.search).not.toContain("createdBy=");
    expect(result.current.search).toContain("assigned=alice");
  });

  it("preserves assigned= (empty) when assignedEmails is cleared — prevents re-default", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=me@example.com"),
    });
    act(() => {
      result.current.setFilters({
        search: "",
        projectIds: [],
        assignedEmails: [],
        createdByEmail: null,
      });
    });
    rerender();
    expect(result.current.filters.assignedEmails).toEqual([]);
    expect(result.current.search).toContain("assigned=");
  });
});
