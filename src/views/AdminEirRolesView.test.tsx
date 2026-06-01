import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  entries: [] as Array<{
    id: number;
    email: string;
    displayName: string;
    roles: string[];
    note: string;
  }>,
  isLoading: false,
  add: { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, error: null as unknown, reset: vi.fn() },
  update: { mutate: vi.fn(), isPending: false, error: null as unknown },
  remove: { mutate: vi.fn(), isPending: false, error: null as unknown },
}));

vi.mock("@/hooks/useIsAdmin", () => ({ useIsAdmin: () => mocks.isAdmin }));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ displayName: "Demo User", email: "demo.user@altronic-llc.com" }),
}));
vi.mock("@/hooks/useEirRoles", () => ({
  useEirRoles: () => ({ data: mocks.entries, isLoading: mocks.isLoading }),
  useAddEirRole: () => mocks.add,
  useUpdateEirRole: () => mocks.update,
  useRemoveEirRole: () => mocks.remove,
}));

import { AdminEirRolesView } from "./AdminEirRolesView";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAdmin = true;
  mocks.isLoading = false;
  mocks.entries = [];
});

describe("AdminEirRolesView", () => {
  it("shows a not-authorised notice for non-admins", () => {
    mocks.isAdmin = false;
    renderWithProviders(<AdminEirRolesView />, { route: "/admin/eir-roles" });
    expect(screen.getByText(/Admin access required/i)).toBeInTheDocument();
  });

  it("renders a row per tagged user with role checkboxes reflecting their roles", () => {
    mocks.entries = [
      { id: 1, email: "eng@altronic-llc.com", displayName: "Eng User", roles: ["engineer"], note: "" },
    ];
    renderWithProviders(<AdminEirRolesView />, { route: "/admin/eir-roles" });
    expect(screen.getByText("Eng User")).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    // [Engineer, Supply Chain] for the single row
    expect(checkboxes[0].checked).toBe(true); // engineer
    expect(checkboxes[1].checked).toBe(false); // supply chain
  });

  it("toggles a role via its checkbox", async () => {
    const user = userEvent.setup();
    mocks.entries = [
      { id: 7, email: "eng@altronic-llc.com", displayName: "Eng User", roles: ["engineer"], note: "" },
    ];
    renderWithProviders(<AdminEirRolesView />, { route: "/admin/eir-roles" });
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]); // add Supply Chain
    expect(mocks.update.mutate).toHaveBeenCalledWith({
      id: 7,
      roles: ["engineer", "supply chain"],
    });
  });

  it("removes a user after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.entries = [
      { id: 9, email: "sc@altronic-llc.com", displayName: "SC User", roles: ["supply chain"], note: "" },
    ];
    renderWithProviders(<AdminEirRolesView />, { route: "/admin/eir-roles" });
    await user.click(screen.getByRole("button", { name: /Remove/i }));
    expect(mocks.remove.mutate).toHaveBeenCalledWith(9);
  });

  it("adds a user with a chosen role from the modal", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminEirRolesView />, { route: "/admin/eir-roles" });
    await user.click(screen.getByRole("button", { name: /Add user/i }));

    const dialogHeading = screen.getByText(/Add user to EIR Roles/i);
    expect(dialogHeading).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("someone@altronic-llc.com"),
      "new.person@altronic-llc.com",
    );
    // Tick Engineer inside the modal.
    const modal = dialogHeading.closest("div")!.parentElement!;
    const engineerCheckbox = within(modal).getAllByRole("checkbox")[0];
    await user.click(engineerCheckbox);

    // Submit (the form's "Add user" button is the last one with that name).
    const addButtons = screen.getAllByRole("button", { name: /^Add user$/i });
    await user.click(addButtons[addButtons.length - 1]);

    expect(mocks.add.mutateAsync).toHaveBeenCalledWith({
      email: "new.person@altronic-llc.com",
      displayName: "",
      roles: ["engineer"],
      note: "",
    });
  });
});
