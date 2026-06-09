import { describe, it, expect } from "vitest";
import { BOOTSTRAP_ADMINS, isAdminEmail } from "./adminAccess";
import type { AdminEntry } from "@/types/task";

const LIST: AdminEntry[] = [
  { id: 1, email: "jane.smith@altronic-llc.com", displayName: "Jane", note: "" },
];

describe("isAdminEmail", () => {
  it("returns true for a bootstrap admin even with an empty list", () => {
    expect(isAdminEmail("ray.white@altronic-llc.com", [])).toBe(true);
  });

  it("is case-insensitive for bootstrap admins", () => {
    expect(isAdminEmail("Ray.White@Altronic-LLC.com", [])).toBe(true);
  });

  it("returns true for an email present on the Admins list", () => {
    expect(isAdminEmail("jane.smith@altronic-llc.com", LIST)).toBe(true);
  });

  it("is case-insensitive against the list", () => {
    expect(isAdminEmail("JANE.SMITH@altronic-llc.com", LIST)).toBe(true);
  });

  it("returns false for a non-admin not on the list", () => {
    expect(isAdminEmail("random.person@altronic-llc.com", LIST)).toBe(false);
  });

  it("returns false for empty / nullish email", () => {
    expect(isAdminEmail("", LIST)).toBe(false);
    expect(isAdminEmail(null, LIST)).toBe(false);
    expect(isAdminEmail(undefined, LIST)).toBe(false);
  });

  it("exposes the bootstrap set (Ray is always an admin)", () => {
    expect(BOOTSTRAP_ADMINS.has("ray.white@altronic-llc.com")).toBe(true);
  });
});
