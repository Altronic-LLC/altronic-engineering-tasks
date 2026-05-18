import { describe, it, expect } from "vitest";
import { attachTestSheetReferences, toTestSheet } from "./testSheetMapper";
import type { GraphListItem, ProjectReference, TestSheet } from "@/types/task";

function item(over: Partial<GraphListItem> = {}): GraphListItem {
  return {
    id: "1",
    createdDateTime: "2026-01-01T00:00:00Z",
    lastModifiedDateTime: "2026-01-02T00:00:00Z",
    fields: {},
    ...over,
  };
}

describe("toTestSheet — basic field mapping", () => {
  it("parses id from string", () => {
    expect(toTestSheet(item({ id: "42" })).id).toBe(42);
  });

  it("falls back to a placeholder title when missing", () => {
    expect(toTestSheet(item()).title).toBe("(untitled test sheet)");
  });

  it("maps text fields", () => {
    const s = toTestSheet(
      item({
        fields: {
          Title: "Endurance run",
          Product: "AMP-5000",
          SerialNumber: "S-001",
          Purpose: "Validate",
          Results: "Pass",
          TestingSteps: "1. Boot\n2. Run",
          FirmwareVersion: "5.2.0",
        },
      }),
    );
    expect(s.title).toBe("Endurance run");
    expect(s.product).toBe("AMP-5000");
    expect(s.serialNumber).toBe("S-001");
    expect(s.purpose).toBe("Validate");
    expect(s.results).toBe("Pass");
    expect(s.testingSteps).toBe("1. Boot\n2. Run");
    expect(s.firmwareVersion).toBe("5.2.0");
  });

  it("parses TestDate when present and null when not", () => {
    expect(toTestSheet(item()).testDate).toBeNull();
    const d = toTestSheet(item({ fields: { TestDate: "2026-04-22T14:00:00Z" } })).testDate;
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2026-04-22T14:00:00.000Z");
  });

  it("returns null testDate for invalid date strings", () => {
    expect(toTestSheet(item({ fields: { TestDate: "not-a-date" } })).testDate).toBeNull();
  });
});

describe("toTestSheet — lookups", () => {
  it("captures Project Reference and Task Reference lookup ids", () => {
    const s = toTestSheet(
      item({
        fields: {
          ProjectReferenceLookupId: 274,
          TaskReferenceLookupId: "115",
        },
      }),
    );
    expect(s.parentProject).toEqual({ lookupId: 274, title: "" });
    expect(s.parentTask).toEqual({ id: 115, numberedTitle: "" });
  });

  it("returns null lookups when fields absent", () => {
    const s = toTestSheet(item());
    expect(s.parentProject).toBeNull();
    expect(s.parentTask).toBeNull();
  });
});

describe("toTestSheet — Tester (single person)", () => {
  it("accepts single-person object shape", () => {
    const s = toTestSheet(
      item({
        fields: {
          Tester: { LookupId: 46, LookupValue: "Sarah Shaffer", Email: "sarah@x.com" },
        },
      }),
    );
    expect(s.tester).toEqual({
      displayName: "Sarah Shaffer",
      email: "sarah@x.com",
      lookupId: 46,
    });
  });

  it("accepts single-element array shape (multi-person column with one entry)", () => {
    const s = toTestSheet(
      item({
        fields: {
          Tester: [{ LookupId: 87, LookupValue: "Thomas", Email: "thomas@x.com" }],
        },
      }),
    );
    expect(s.tester?.displayName).toBe("Thomas");
  });

  it("returns null when tester field is empty / unset", () => {
    expect(toTestSheet(item()).tester).toBeNull();
    expect(toTestSheet(item({ fields: { Tester: null } })).tester).toBeNull();
  });

  it("returns null when the entry has no displayName", () => {
    const s = toTestSheet(item({ fields: { Tester: { LookupId: 1 } } }));
    expect(s.tester).toBeNull();
  });
});

describe("toTestSheet — author from createdBy.user", () => {
  it("maps createdBy.user to author", () => {
    const s = toTestSheet(
      item({ createdBy: { user: { displayName: "Ray White", email: "ray@x.com" } } }),
    );
    expect(s.author).toEqual({ displayName: "Ray White", email: "ray@x.com" });
  });

  it("returns null when no createdBy", () => {
    expect(toTestSheet(item()).author).toBeNull();
  });
});

describe("attachTestSheetReferences", () => {
  function sheet(over: Partial<TestSheet> = {}): TestSheet {
    return {
      id: 1,
      title: "T",
      product: "",
      serialNumber: "",
      purpose: "",
      results: "",
      testDate: null,
      parentProject: null,
      parentTask: null,
      tester: null,
      testingSteps: "",
      firmwareVersion: "",
      createdAt: new Date(),
      modifiedAt: new Date(),
      author: null,
      ...over,
    };
  }

  const projects: ProjectReference[] = [
    { lookupId: 10, title: "Alpha" },
    { lookupId: 20, title: "Beta" },
  ];
  const tasks = [
    { id: 100, numberedTitle: "T100-A-First" },
    { id: 200, numberedTitle: "T200-B-Second" },
  ];

  it("fills project title from the supplied catalogue", () => {
    const s = sheet({ parentProject: { lookupId: 20, title: "" } });
    attachTestSheetReferences([s], projects, tasks);
    expect(s.parentProject?.title).toBe("Beta");
  });

  it("fills task numberedTitle from the catalogue", () => {
    const s = sheet({ parentTask: { id: 200, numberedTitle: "" } });
    attachTestSheetReferences([s], projects, tasks);
    expect(s.parentTask?.numberedTitle).toBe("T200-B-Second");
  });

  it("leaves title placeholder intact when lookup missing from catalogue", () => {
    const s = sheet({
      parentProject: { lookupId: 999, title: "placeholder" },
      parentTask: { id: 999, numberedTitle: "" },
    });
    attachTestSheetReferences([s], projects, tasks);
    expect(s.parentProject?.title).toBe("placeholder");
    expect(s.parentTask?.numberedTitle).toBe("");
  });

  it("returns the same array reference", () => {
    const arr = [sheet()];
    expect(attachTestSheetReferences(arr, projects, tasks)).toBe(arr);
  });
});
