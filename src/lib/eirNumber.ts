import type { Eir } from "@/types/task";

/**
 * Compute the next EIR No for a brand-new EIR.
 *
 * Format: `EIR_YYYY-####` — the current year, then a 4-digit sequence that is
 * the next number for that year (the highest existing sequence for the year
 * + 1, zero-padded). The SharePoint "EIR Log No." column is calculated from
 * "EIR No" (`EIRNo`), so we only ever write this to `EIRNo`.
 *
 * When scanning existing numbers we match both the current underscore format
 * (`EIR_2026-0083`) and the older hyphen format (`EIR-2026-0042`), so a mix in
 * the data doesn't restart the count. Numbers from other years are ignored.
 *
 * Note: this is computed client-side from the loaded EIR list, so two people
 * creating an EIR at the exact same moment could in theory land on the same
 * number — same lost-update window as the comment field. Acceptable for now.
 */
export function nextEirNo(existing: Eir[], now: Date = new Date()): string {
  const year = now.getFullYear();
  const re = new RegExp(`^EIR[_-]${year}-(\\d+)$`, "i");
  let max = 0;
  for (const e of existing) {
    const m = re.exec((e.eirNo ?? "").trim());
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `EIR_${year}-${String(max + 1).padStart(4, "0")}`;
}
