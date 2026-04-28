import { runner } from "../lib/runner.ts";
import * as cheerio from "npm:cheerio@1.0.0-rc.12";
import { cleanCell, cleanHeader, cleanNumber } from "../lib/cleaners.ts";

type PersonalTaxRate = {
  name: string;
  year: number;
  period: string | null;
  rate: {
    rate: number;
    rules: [string, number][];
  };
};

await runner(
  Deno.args[0],
  async (html: string): Promise<PersonalTaxRate[]> => {
    const $ = await cheerio.load(html);
    const structure: PersonalTaxRate[] = [];

    $("table").each((_, table) => {
      const caption = cleanHeader($(table).find("caption").first());
      if (!caption.includes("tax rates and income thresholds")) return;
      if (caption.includes("Quebec")) return;

      const yearMatch = caption.match(/\b(20\d{2})\b/);
      if (!yearMatch) return;

      const parsedCaption = parseCaption(caption, parseInt(yearMatch[1]));
      if (!parsedCaption) return;

      $(table).find("tr").each((_, row) => {
        const cells = $(row).find("td,th").map((_, cell) => cleanCell($(cell)))
          .get();

        if (cells.length < 3) return;

        const from = parseMoney(cells[0]);
        if (!Number.isFinite(from)) return;
        const to = cells[1].toLowerCase().includes("over")
          ? null
          : parseMoney(cells[1]);
        const rate = cleanNumber(cells[2]);
        const rules = buildRules(from, to);

        structure.push({
          name: parsedCaption.name,
          year: parsedCaption.year,
          period: parsedCaption.period,
          rate: {
            rate,
            rules,
          },
        });
      });
    });

    if (structure.length === 0) {
      throw new Error("No personal tax rate tables found.");
    }

    return structure;
  },
  null,
);

function parseCaption(
  caption: string,
  year: number,
): { name: string; year: number; period: string | null } | null {
  const suffix = " tax rates and income thresholds";
  const prefix = caption.slice(0, caption.indexOf(suffix)).trim();
  const normalized = prefix.replace(/^New\s+/, "").replace(
    /\s+\(using the prorated rate\)$/i,
    "",
  ).trim();

  const periodFirstMatch = normalized.match(
    /^(July 1 to December 31|January(?: 1)? to June 30),?\s*(20\d{2})\s+(.*)$/i,
  );
  if (periodFirstMatch) {
    const name = periodFirstMatch[3].trim();
    if (name.length === 0 || name.toLowerCase() === "quebec") return null;
    return {
      name,
      year: parseInt(periodFirstMatch[2]),
      period: periodFirstMatch[1],
    };
  }

  const yearFirstMatch = normalized.match(/^(20\d{2})\s+(.*)$/);
  if (!yearFirstMatch) return null;

  const name = yearFirstMatch[2].trim();
  if (name.length === 0 || name.toLowerCase() === "quebec") return null;

  return {
    name,
    year: parseInt(yearFirstMatch[1]),
    period: null,
  };
}

function parseMoney(value: string): number {
  return cleanNumber(value.replace("and over", ""));
}

function buildRules(from: number, to: number | null): [string, number][] {
  const rules: [string, number][] = [];
  if (from > 0) rules.push([">", from - 0.01]);
  if (to !== null) rules.push(["<=", to]);
  return rules;
}
