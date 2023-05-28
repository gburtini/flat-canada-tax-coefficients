import { cheerio } from "https://deno.land/x/cheerio@1.0.7/mod.ts";
import { runner, defaultProcessor, defaultCleaner } from "../lib/runner.ts";

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
    let data: { [key: string]: string }[] = [];
    for (const table of tables) {
      const record = await defaultProcessor(
        $(table),
        Object.keys(FIELD_MAP), // TODO: ew, this assumes the keys don't change. Instead, extract them.
        true
      )(html);
      data = [...data, ...record];
    }
    return data;
  },
  defaultCleaner(FIELD_MAP, FIELD_MULTIPLIERS)
);
