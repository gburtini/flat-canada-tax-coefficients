import * as cheerio from "npm:cheerio@1.0.0-rc.12";
import { cleanCell, cleanHeader } from "../lib/cleaners.ts";
import { defaultCleaner, runner } from "../lib/runner.ts";

const FIELD_MAP: { [key: string]: string } = {
  Year: "year",
  "Maximum annual pensionable earnings": "maximumAnnualPensionableEarnings",
  "Basic exemption amount": "basicExemptionAmount",
  "Maximum contributory earnings": "maximumContributoryEarnings",
  "Employee and employer contribution rate (%)": "employmentContributionRate",
  "Maximum annual employee and employer contribution":
    "maximumAnnualEmploymentContribution",
  "Maximum annual self-employed contribution":
    "maximumAnnualSelfEmploymentContribution",
};
const FIELD_MULTIPLIERS: { [key: string]: number } = {
  employmentContributionRate: 1 / 100, // no % sign present in the dataset.
};

await runner(
  Deno.args[0],
  async (html: string) => {
    const $ = await cheerio.load(html);

    const tables = $(".table-responsive>table").get();
    const data: { [key: string]: string }[] = [];
    for (const table of tables) {
      $(table)
        .find("tr")
        .each((_, row) => {
          const cells = $(row)
            .find("th,td")
            .map((_, cell) => cleanCell($(cell)))
            .get();

          if (cells.length !== Object.keys(FIELD_MAP).length) return;
          if (cells[0] === "Year") return;

          const headers = $(row)
            .find("th")
            .map((_, header) => cleanHeader($(header)))
            .get();

          if (headers.length === cells.length && headers.length > 0) {
            data.push(
              Object.fromEntries(
                headers.map((header, index) => [header, cells[index]]),
              ),
            );
            return;
          }

          data.push(
            Object.fromEntries(
              Object.keys(FIELD_MAP).map((header, index) => [
                header,
                cells[index],
              ]),
            ),
          );
        });
    }
    return data;
  },
  defaultCleaner(FIELD_MAP, FIELD_MULTIPLIERS),
);
