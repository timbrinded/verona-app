export type CsvRow = Record<string, string>;

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (quoted) {
    throw new Error("Invalid CSV: unterminated quoted field");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...body] = rows.filter((line) => line.some((cell) => cell.length > 0));
  if (!headers) return [];
  const normalizedHeaders = headers.map((header) => header.trim());
  const seenHeaders = new Set<string>();
  for (const header of normalizedHeaders) {
    if (!header) {
      throw new Error("Invalid CSV: empty header");
    }
    if (seenHeaders.has(header)) {
      throw new Error(`Invalid CSV: duplicate header ${header}`);
    }
    seenHeaders.add(header);
  }

  return body.map((line) =>
    Object.fromEntries(normalizedHeaders.map((header, index) => [header, line[index] ?? ""])),
  );
}
