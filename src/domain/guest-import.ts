import type { Guest, Party, Table } from "./models";

export type ImportSeverity = "error" | "warning";

export interface ImportIssue {
  severity: ImportSeverity;
  row?: number;
  field?: string;
  message: string;
}

export interface GuestImportPreview {
  guests: Guest[];
  parties: Party[];
  tables: Table[];
  issues: ImportIssue[];
  sourceRows: number;
}

const requiredHeaders = ["first_name", "last_name", "party"] as const;

function slug(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unassigned";
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function buildGuestImportPreview(csv: string, eventId: string): GuestImportPreview {
  const rows = parseCsv(csv);
  const issues: ImportIssue[] = [];
  if (rows.length === 0) return { guests: [], parties: [], tables: [], issues: [{ severity: "error", message: "The CSV file is empty." }], sourceRows: 0 };

  const headers = rows[0].map((header) => slug(header));
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) issues.push({ severity: "error", field: header, message: `Missing required column: ${header}` });
  }
  if (issues.some((issue) => issue.severity === "error")) return { guests: [], parties: [], tables: [], issues, sourceRows: Math.max(rows.length - 1, 0) };

  const valueAt = (values: string[], field: string) => values[headers.indexOf(field)]?.trim() ?? "";
  const guests: Guest[] = [];
  const partyGuestIds = new Map<string, string[]>();
  const partyLabels = new Map<string, string>();
  const tables = new Map<string, Table>();
  const exactIdentities = new Set<string>();
  const names = new Map<string, number[]>();

  rows.slice(1).forEach((values, offset) => {
    const rowNumber = offset + 2;
    const firstName = valueAt(values, "first_name");
    const lastName = valueAt(values, "last_name");
    const partyLabel = valueAt(values, "party");
    const tableLabel = valueAt(values, "table");
    const zone = valueAt(values, "zone");
    const note = valueAt(values, "note");
    if (!firstName || !lastName || !partyLabel) {
      issues.push({ severity: "error", row: rowNumber, message: "First name, last name, and party are required." });
      return;
    }

    const partyId = `party_${slug(partyLabel)}`;
    const tableId = tableLabel ? `table_${slug(tableLabel)}` : undefined;
    const identity = `${firstName} ${lastName}|${partyLabel}|${tableLabel}`.toLocaleLowerCase();
    if (exactIdentities.has(identity)) {
      issues.push({ severity: "error", row: rowNumber, message: `Duplicate guest row: ${firstName} ${lastName}` });
      return;
    }
    exactIdentities.add(identity);

    const guestId = `guest_import_${rowNumber - 1}`;
    const guest: Guest = { id: guestId, eventId, partyId, firstName, lastName, tableId, status: tableId ? "expected" : "needs_attention", note: note || undefined };
    guests.push(guest);
    partyLabels.set(partyId, partyLabel);
    partyGuestIds.set(partyId, [...(partyGuestIds.get(partyId) ?? []), guestId]);
    if (tableId && !tables.has(tableId)) tables.set(tableId, { id: tableId, label: tableLabel, zone: zone || undefined });
    if (!tableId) issues.push({ severity: "warning", row: rowNumber, field: "table", message: `${firstName} ${lastName} has no table assignment.` });

    const nameKey = `${firstName} ${lastName}`.toLocaleLowerCase();
    names.set(nameKey, [...(names.get(nameKey) ?? []), rowNumber]);
  });

  for (const [name, duplicateRows] of names) {
    if (duplicateRows.length > 1) issues.push({ severity: "warning", row: duplicateRows[0], message: `Duplicate name requires party/table verification: ${name}` });
  }

  const parties: Party[] = [...partyGuestIds].map(([id, guestIds]) => ({ id, displayName: partyLabels.get(id) ?? id, guestIds }));
  return { guests, parties, tables: [...tables.values()], issues, sourceRows: rows.length - 1 };
}
