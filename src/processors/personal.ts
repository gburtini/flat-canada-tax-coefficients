import { runner, defaultProcessor, defaultCleaner } from "../lib/runner.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";
import { cleanTaxRateString, cleanHeader } from "../lib/cleaners.ts";
await runner(
  Deno.args[0],
  async (html) => {
    // TODO: clean this up and handle the accrual data.

    const $ = await cheerio.load(html);

    const federalHeader = $("h2#federal");

    const yearMatch = cleanHeader(federalHeader).match("[0-9]{4}");
    if (!yearMatch || yearMatch.length > 1)
      throw new Error(
        "Could not find year or found more than one possible value for year."
      );
    const year = parseInt(yearMatch[0]);

    const federalRates: string[] = federalHeader
      .parent()
      .next()
      .find("li")
      .map((i, p) => $(p).text())
      .get();

    const federal = federalRates.map(cleanTaxRateString);

    const provinceMap: {
      [key: string]: { rate: number; rules: [string, number][] }[];
    } = {};
    const provincialTable = $(
      "caption:contains('Provincial and territorial tax rates (combined chart)')"
    ).closest("table");
    provincialTable.find("tr").each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find("td");
      const province = cleanHeader(cells.eq(0));
      const rates: string[] = cells
        .eq(1)
        .find("p")
        .map((i, p) => $(p).text())
        .get();

      provinceMap[province] = rates.map(cleanTaxRateString);
    });

    console.log(federal, provinceMap);

    const structure: {
      name: string;
      year: number;
      rate: { rate: number; rules: any[] };
    }[] = [];

    federal.forEach((rate, i) => {
      structure.push({
        name: "federal",
        year,
        rate,
      });
    });

    Object.keys(provinceMap).forEach((province) => {
      provinceMap[province].forEach((rate, i) => {
        structure.push({
          name: province,
          year,
          rate,
        });
      });
    });

    return structure;
  },
  null,
  {
    removeFile: false,
  }
);
