import * as cheerio from "npm:cheerio@1.0.0-rc.12";
import { cleanCell } from "../lib/cleaners.ts";
import { defaultCleaner, runner } from "../lib/runner.ts";

const TABLE_HEADER = "TFSA and ALDA dollar limits";
const keys: string[] = ["year", "TFSA dollar limit", "ALDA dollar limit"];
const FIELD_MAP: { [key: string]: string } = {
  "TFSA dollar limit": "limit",
  "ALDA dollar limit": "aldaLimit",
};

await runner(
  Deno.args[0],
  async (html: string) => {
    const $ = cheerio.load(html);
    const table = $("table").filter((_, element) =>
      cleanCell($(element).find("caption").first()).includes(TABLE_HEADER)
    ).first();

    if (table.length !== 1) {
      throw new Error(`Expected one TFSA table, found ${table.length}.`);
    }

    const rows: Record<string, string>[] = [];
    table.find("tr").each((_, row) => {
      const cells = $(row).find("th,td").map((_, cell) => cleanCell($(cell)))
        .get();

      if (cells.length !== keys.length) return;
      if (cells[0] === "Year") return;

      rows.push(
        Object.fromEntries(keys.map((key, index) => [key, cells[index]])),
      );
    });

    return rows;
  },
  defaultCleaner(FIELD_MAP),
);
