import { describe, it, expect } from "vitest";
import { nextEirNo } from "./eirNumber";
import type { Eir } from "@/types/task";

const eir = (eirNo: string): Eir => ({ eirNo }) as unknown as Eir;
const NOW_2026 = new Date("2026-06-04T12:00:00");

describe("nextEirNo", () => {
  it("starts at 0001 for a year with no EIRs", () => {
    expect(nextEirNo([], NOW_2026)).toBe("EIR_2026-0001");
    expect(nextEirNo([eir("EIR_2025-0042")], NOW_2026)).toBe("EIR_2026-0001");
  });

  it("uses the highest existing sequence for the current year + 1", () => {
    const existing = [
      eir("EIR_2026-0001"),
      eir("EIR_2026-0083"),
      eir("EIR_2026-0007"),
    ];
    expect(nextEirNo(existing, NOW_2026)).toBe("EIR_2026-0084");
  });

  it("zero-pads to four digits", () => {
    expect(nextEirNo([eir("EIR_2026-0008")], NOW_2026)).toBe("EIR_2026-0009");
  });

  it("counts both underscore and hyphen formats, ignores other years", () => {
    const existing = [
      eir("EIR-2026-0050"), // older hyphen format
      eir("EIR_2026-0049"),
      eir("EIR_2027-0999"), // different year — ignored
      eir(""), // blank — ignored
    ];
    expect(nextEirNo(existing, NOW_2026)).toBe("EIR_2026-0051");
  });
});
