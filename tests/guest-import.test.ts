import { describe, expect, it } from "vitest";
import { buildGuestImportPreview, parseCsv } from "../src/domain/guest-import";

describe("guest import", () => {
  it("parses commas and escaped quotes in quoted cells", () => {
    expect(parseCsv('first_name,note\nAmelia,"Host, says ""VIP"""')).toEqual([
      ["first_name", "note"],
      ["Amelia", 'Host, says "VIP"'],
    ]);
  });

  it("blocks files missing required columns", () => {
    const preview = buildGuestImportPreview("first_name,last_name\nAmelia,Bennett", "event_1");
    expect(preview.issues).toContainEqual(expect.objectContaining({ severity: "error", field: "party" }));
    expect(preview.guests).toEqual([]);
  });

  it("normalizes parties and tables while retaining duplicate names", () => {
    const preview = buildGuestImportPreview([
      "first_name,last_name,party,table,zone,note",
      "Jordan,Carter,Carter / Lewis,Rose 2,Main floor,",
      "Jordan,Carter,Carter,Magnolia 3,East wing,Dietary note",
    ].join("\n"), "event_1");
    expect(preview.guests).toHaveLength(2);
    expect(preview.parties).toHaveLength(2);
    expect(preview.tables).toHaveLength(2);
    expect(preview.issues).toContainEqual(expect.objectContaining({ severity: "warning", message: expect.stringContaining("Duplicate name") }));
  });

  it("blocks exact duplicate rows and warns about missing tables", () => {
    const preview = buildGuestImportPreview([
      "first_name,last_name,party,table",
      "Sam,Reed,Reed party,",
      "Sam,Reed,Reed party,",
    ].join("\n"), "event_1");
    expect(preview.guests).toHaveLength(1);
    expect(preview.issues.filter((issue) => issue.severity === "error")).toHaveLength(1);
    expect(preview.issues.filter((issue) => issue.severity === "warning")).toHaveLength(1);
  });
});
