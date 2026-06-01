import { describe, it, expect } from "vitest";
import {
  addEirRole,
  listEirRoles,
  parseRoles,
  removeEirRole,
  serializeRoles,
  updateEirRole,
} from "./eirRoles";

// USE_MOCK defaults to true under Vitest (no VITE_USE_MOCK env), so every call
// here exercises the in-memory mock branch.

describe("parseRoles", () => {
  it("keeps known tags and drops unknown / blank tokens", () => {
    expect(parseRoles("engineer,supply chain")).toEqual(["engineer", "supply chain"]);
    expect(parseRoles("ENGINEER , , bogus")).toEqual(["engineer"]);
    expect(parseRoles("")).toEqual([]);
  });

  it("de-duplicates and returns canonical order regardless of input order", () => {
    expect(parseRoles("supply chain,engineer,engineer")).toEqual([
      "engineer",
      "supply chain",
    ]);
  });
});

describe("serializeRoles", () => {
  it("joins in canonical order and ignores duplicates", () => {
    expect(serializeRoles(["supply chain", "engineer"])).toBe("engineer,supply chain");
    expect(serializeRoles([])).toBe("");
  });

  it("round-trips with parseRoles", () => {
    expect(parseRoles(serializeRoles(["supply chain"]))).toEqual(["supply chain"]);
  });
});

describe("eirRoles mock CRUD", () => {
  it("lists the seeded entries, demo user holding both roles", async () => {
    const entries = await listEirRoles();
    const demo = entries.find((e) => e.email === "demo.user@altronic-llc.com");
    expect(demo).toBeDefined();
    expect(demo!.roles).toEqual(["engineer", "supply chain"]);
  });

  it("adds a new entry", async () => {
    const before = await listEirRoles();
    const created = await addEirRole({
      email: "new.user@altronic-llc.com",
      displayName: "New User",
      roles: ["engineer"],
      note: "added in test",
    });
    expect(created.id).toBeGreaterThan(0);
    const after = await listEirRoles();
    expect(after.length).toBe(before.length + 1);
    expect(after.find((e) => e.id === created.id)?.roles).toEqual(["engineer"]);
  });

  it("updates roles / displayName / note on an existing entry", async () => {
    const created = await addEirRole({
      email: "edit.me@altronic-llc.com",
      displayName: "Edit Me",
      roles: [],
      note: "",
    });
    await updateEirRole({ id: created.id, roles: ["supply chain"], note: "buyer" });
    const after = await listEirRoles();
    const row = after.find((e) => e.id === created.id)!;
    expect(row.roles).toEqual(["supply chain"]);
    expect(row.note).toBe("buyer");
    // displayName left untouched when not passed
    expect(row.displayName).toBe("Edit Me");
  });

  it("removes an entry", async () => {
    const created = await addEirRole({
      email: "remove.me@altronic-llc.com",
      displayName: "Remove Me",
      roles: ["engineer"],
      note: "",
    });
    await removeEirRole(created.id);
    const after = await listEirRoles();
    expect(after.find((e) => e.id === created.id)).toBeUndefined();
  });
});
