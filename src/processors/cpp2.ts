import * as cheerio from "npm:cheerio@1.0.0-rc.12";
import { cleanCell, cleanNumber } from "../lib/cleaners.ts";
import { readJSON, writeJSON } from "../lib/runner.ts";

type Cpp2Row = {
  year: number;
  additionalMaximumAnnualPensionableEarnings: number;
  secondAdditionalContributionRate: number;
  maximumAnnualSecondAdditionalEmploymentContribution: number;
  maximumAnnualSecondAdditionalSelfEmploymentContribution: number;
};

const html = await Deno.readTextFile(Deno.args[0]);
const cpp2Rows = await extractCpp2Rows(html);
const existingRows = await readJSON("./data/cpp.json");

const mergedRows = existingRows.map((row) => {
  const year = row.year;
  if (typeof year !== "number") return row;

  const cpp2Row = cpp2Rows.find((candidate) => candidate.year === year);
  return cpp2Row ? { ...row, ...cpp2Row } : row;
});

await writeJSON("./data/cpp.json", mergedRows);

async function extractCpp2Rows(html: string): Promise<Cpp2Row[]> {
  const $ = await cheerio.load(html);
  const table = $("table:has(caption:contains('CPP2 contribution rates'))");
  if (table.length !== 1) {
    throw new Error(`Expected one CPP2 table, found ${table.length}.`);
  }

  return table.find("tbody tr").map((_, row) => {
    const cells = $(row).find("td,th").map((_, cell) => cleanCell($(cell)))
      .get();
    if (cells.length === 0) {
      return;
    }
    if (cells.length !== 5) {
      return;
    }

    return {
      year: cleanNumber(cells[0]),
      additionalMaximumAnnualPensionableEarnings: cleanNumber(cells[1]),
      secondAdditionalContributionRate: cleanNumber(cells[2]),
      maximumAnnualSecondAdditionalEmploymentContribution: cleanNumber(
        cells[3],
      ),
      maximumAnnualSecondAdditionalSelfEmploymentContribution: cleanNumber(
        cells[4],
      ),
    };
  }).get().filter((row): row is Cpp2Row => row !== undefined);
}
