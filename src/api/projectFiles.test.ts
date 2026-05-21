import { describe, expect, it } from "vitest";
import {
  projectCodePrefix,
  resolveFolderForProject,
  targetFilename,
  type ProjectFolder,
} from "./projectFiles";

const folders: ProjectFolder[] = [
  { id: "f1", name: "NGI-5000", webUrl: "https://sp/NGI-5000", projectLookupId: 412 },
  { id: "f2", name: "ACES Ignition 352-MT", webUrl: "https://sp/ACES", projectLookupId: 274 },
  { id: "misc", name: "Miscellaneous", webUrl: "https://sp/Misc", projectLookupId: 0 },
];

const projects = [
  { lookupId: 412, title: "323-MT-NGI-5000 CIU (Cylinder Ignition Unit)" },
  { lookupId: 274, title: "352-MT-ACES" },
  { lookupId: 999, title: "501-NS-Brand New Project" },
];

describe("projectCodePrefix", () => {
  it("returns the leading code before the first whitespace", () => {
    expect(projectCodePrefix("323-MT-NGI-5000 CIU (Cylinder Ignition Unit)")).toBe(
      "323-MT-NGI-5000",
    );
    expect(projectCodePrefix("352-MT-ACES")).toBe("352-MT-ACES");
    expect(projectCodePrefix("349-MT-ACI fugitive emission recovery")).toBe("349-MT-ACI");
  });

  it("tolerates blank / null / undefined input", () => {
    expect(projectCodePrefix("")).toBe("");
    expect(projectCodePrefix("   ")).toBe("");
    expect(projectCodePrefix(null)).toBe("");
    expect(projectCodePrefix(undefined)).toBe("");
  });
});

describe("resolveFolderForProject", () => {
  it("matches a project folder when the task's project has a folder", () => {
    const r = resolveFolderForProject(
      folders,
      { lookupId: 412, title: "" },
      projects,
    );
    expect(r?.kind).toBe("project");
    expect(r && r.kind === "project" && r.folder.name).toBe("NGI-5000");
  });

  it("falls back to Miscellaneous + prefix when no folder matches the project", () => {
    const r = resolveFolderForProject(
      folders,
      { lookupId: 999, title: "501-NS-Brand New Project" },
      projects,
    );
    expect(r?.kind).toBe("misc");
    expect(r && r.kind === "misc" && r.filenamePrefix).toBe("501-NS-Brand");
  });

  it("looks up the title from the projects catalogue when parentProject.title is blank", () => {
    // This is the bug the user hit — task came in with `title: ""` and
    // the Misc prefix was silently dropping.
    const r = resolveFolderForProject(
      folders,
      { lookupId: 999, title: "" },
      projects,
    );
    expect(r?.kind).toBe("misc");
    expect(r && r.kind === "misc" && r.filenamePrefix).toBe("501-NS-Brand");
  });

  it("falls back to a LID-<n> prefix when title can't be resolved at all", () => {
    const r = resolveFolderForProject(
      folders,
      { lookupId: 7777, title: "" },
      [], // empty catalogue
    );
    expect(r?.kind).toBe("misc");
    expect(r && r.kind === "misc" && r.filenamePrefix).toBe("LID-7777");
  });

  it("uses the fallback prefix when the task has no parent project at all", () => {
    // The user's actual breakage: task with parentProject=null. Previous
    // version emitted no prefix at all; now we tag with whatever the
    // hook passes through (typically the task NumberedTitle).
    const r = resolveFolderForProject(
      folders,
      null,
      [],
      "T15-AMP-coil-replacement",
    );
    expect(r?.kind).toBe("misc");
    expect(r && r.kind === "misc" && r.filenamePrefix).toBe("T15-AMP-coil-replacement");
  });

  it("matches a Misc folder case-insensitively even if it's spelled 'misc'", () => {
    const onlyMisc: ProjectFolder[] = [
      { id: "m", name: "misc", webUrl: "", projectLookupId: 0 },
    ];
    const r = resolveFolderForProject(
      onlyMisc,
      { lookupId: 7777, title: "" },
      [],
    );
    expect(r?.kind).toBe("misc");
  });

  it("returns null when no project matches AND no Misc folder exists", () => {
    const noMisc = folders.filter((f) => !/misc/i.test(f.name));
    const r = resolveFolderForProject(
      noMisc,
      { lookupId: 9999, title: "" },
      [],
    );
    expect(r).toBeNull();
  });
});

describe("targetFilename", () => {
  it("prepends the prefix on Misc-resolved uploads", () => {
    const r = resolveFolderForProject(
      folders,
      { lookupId: 999, title: "501-NS-Brand New Project" },
      projects,
    )!;
    expect(targetFilename(r, "drawing.pdf")).toBe("501-NS-Brand_drawing.pdf");
  });

  it("returns the original filename on project-folder uploads", () => {
    const r = resolveFolderForProject(
      folders,
      { lookupId: 412, title: "" },
      projects,
    )!;
    expect(targetFilename(r, "drawing.pdf")).toBe("drawing.pdf");
  });
});
