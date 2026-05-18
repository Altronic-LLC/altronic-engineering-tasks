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
  it("fills assigned with the current user when URL has no assigned param", async () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/"),
    });
    // Effect runs after first render; rerender to pick up the URL update.
    rerender();
    expect(result.current.filters.assignedEmail).toBe("me@example.com");
    expect(result.current.search).toContain("assigned=me%40example.com");
  });

  it("does NOT default when URL already has assigned=someone", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=other@x.com"),
    });
    expect(result.current.filters.assignedEmail).toBe("other@x.com");
  });

  it("respects explicit 'Anyone' (?assigned= empty) — no re-default", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned="),
    });
    rerender();
    expect(result.current.filters.assignedEmail).toBeNull();
    // URL should still have ?assigned= (preserved), not removed.
    expect(result.current.search).toContain("assigned=");
  });

  it("waits for current user email — does not default if email is empty", () => {
    mockUser.email = "";
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/"),
    });
    rerender();
    expect(result.current.filters.assignedEmail).toBeNull();
    expect(result.current.search).toBe("");
  });
});

describe("useFilters — parsing from URL", () => {
  it("parses q into search", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&q=hello%20world"),
    });
    expect(result.current.filters.search).toBe("hello world");
  });

  it("parses project into integer projectId", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&project=42"),
    });
    expect(result.current.filters.projectId).toBe(42);
  });

  it("rejects non-integer project param", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&project=abc"),
    });
    expect(result.current.filters.projectId).toBeNull();
  });

  it("parses createdBy", () => {
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&createdBy=alice@x.com"),
    });
    expect(result.current.filters.createdByEmail).toBe("alice@x.com");
  });

  it("returns empty defaults when no params present and user has no email", () => {
    mockUser.email = "";
    const { result } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/"),
    });
    expect(result.current.filters).toEqual({
      search: "",
      projectId: null,
      assignedEmail: null,
      createdByEmail: null,
    });
  });
});

describe("useFilters — setFilters writes back", () => {
  it("writes search, project, assigned, createdBy to URL", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x"),
    });
    act(() => {
      result.current.setFilters({
        search: "foo",
        projectId: 10,
        assignedEmail: "alice@x.com",
        createdByEmail: "bob@x.com",
      });
    });
    rerender();
    expect(result.current.search).toContain("q=foo");
    expect(result.current.search).toContain("project=10");
    expect(result.current.search).toContain("assigned=alice%40x.com");
    expect(result.current.search).toContain("createdBy=bob%40x.com");
  });

  it("removes q/project/createdBy when set to empty values", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=x&q=foo&project=10&createdBy=bob@x.com"),
    });
    act(() => {
      result.current.setFilters({
        search: "",
        projectId: null,
        assignedEmail: "alice@x.com",
        createdByEmail: null,
      });
    });
    rerender();
    expect(result.current.search).not.toContain("q=");
    expect(result.current.search).not.toContain("project=");
    expect(result.current.search).not.toContain("createdBy=");
    expect(result.current.search).toContain("assigned=alice");
  });

  it("preserves assigned= (empty) when user picks Anyone — prevents re-default", () => {
    const { result, rerender } = renderHook(() => useFiltersAndLocation(), {
      wrapper: wrapperFor("/?assigned=me@example.com"),
    });
    act(() => {
      result.current.setFilters({
        search: "",
        projectId: null,
        assignedEmail: null,
        createdByEmail: null,
      });
    });
    rerender();
    expect(result.current.filters.assignedEmail).toBeNull();
    // The param must remain in the URL (empty value) — otherwise the
    // first-visit default would silently re-apply on the next mount.
    expect(result.current.search).toContain("assigned=");
  });
});
