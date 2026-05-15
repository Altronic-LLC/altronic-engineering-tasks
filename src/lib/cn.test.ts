import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, null, undefined, "", "bar")).toBe("foo bar");
  });

  it("dedupes conflicting tailwind utilities (last one wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays of class values", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object-style conditional classes", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });

  it("composes mixed input types", () => {
    expect(cn("base", { active: true, disabled: false }, ["extra"], "px-2", "px-4")).toBe(
      "base active extra px-4",
    );
  });
});
