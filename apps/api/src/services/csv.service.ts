import { parse } from "csv-parse/sync";

const EMAIL_REGEX =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i;

export interface ParseRecipientResult {
  emails: string[];
  invalid: string[];
}

export function parseRecipientFile(
  input: string,
  filename?: string,
): ParseRecipientResult {
  const emails = new Set<string>();
  const invalid: string[] = [];

  const isCsv =
    filename?.toLowerCase().endsWith(".csv") ||
    input.includes(",");

  if (isCsv) {
    const records = parse(input, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
      trim: true,
    }) as Record<string, unknown>[];

    for (const record of records) {
      let emailFieldFound = false;

      for (const [key, value] of Object.entries(record)) {
        if (typeof value !== "string") continue;

        const normalizedKey = key.trim().toLowerCase();

        if (
          normalizedKey === "email" ||
          normalizedKey === "email address" ||
          normalizedKey === "email_address"
        ) {
          emailFieldFound = true;

          const email = value.trim().toLowerCase();

          if (EMAIL_REGEX.test(email)) {
            emails.add(email);
          } else if (email) {
            invalid.push(email);
          }
        }
      }

      // Fallback: detect an email in any CSV column.
      if (!emailFieldFound) {
        for (const value of Object.values(record)) {
          if (typeof value !== "string") continue;

          const candidate = value.trim().toLowerCase();

          if (EMAIL_REGEX.test(candidate)) {
            emails.add(candidate);
            break;
          }
        }
      }
    }
  } else {
    for (const line of input.split(/\r?\n/)) {
      const value = line.trim().replace(/^["']|["']$/g, "");

      if (!value) continue;

      if (EMAIL_REGEX.test(value)) {
        emails.add(value.toLowerCase());
      } else {
        invalid.push(value);
      }
    }
  }

  return {
    emails: [...emails],
    invalid,
  };
}
