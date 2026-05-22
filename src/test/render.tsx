// Shared test render helper. Wraps a component in the providers it needs:
//   - QueryClientProvider (with retries off and gcTime 0 so each test gets a
//     fresh cache without unmount churn warnings)
//   - MemoryRouter (so useNavigate / useParams / Link work)
//
// Usage:
//   import { renderWithProviders } from "@/test/render";
//   renderWithProviders(<MyComponent />, { route: "/task/1" });
//
// For tests that need MSAL context (real-mode views), mock the msal hooks
// directly with `vi.mock("@azure/msal-react", ...)` in the test file rather
// than trying to instantiate a real PublicClientApplication here.

import type { ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial path for MemoryRouter. Defaults to "/". */
  route?: string;
  /**
   * Wrap the rendered element in a Route at this path so `useParams` works.
   * Example: routePattern: "/task/:id", route: "/task/15" gives access to
   * `useParams<{ id: string }>()` inside the component.
   */
  routePattern?: string;
  /** Pre-seed query data into the client before rendering. */
  seedQueryData?: Array<{ key: readonly unknown[]; data: unknown }>;
}

export function renderWithProviders(
  ui: ReactNode,
  {
    route = "/",
    routePattern,
    seedQueryData,
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  if (seedQueryData) {
    for (const { key, data } of seedQueryData) {
      queryClient.setQueryData(key, data);
    }
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {routePattern ? (
            <Routes>
              <Route path={routePattern} element={children} />
            </Routes>
          ) : (
            children
          )}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
