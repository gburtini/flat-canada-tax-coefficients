import {
  writeJSON,
  readTXT,
  removeFile,
} from "https://deno.land/x/flat@0.0.14/mod.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";

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
  employmentContributionRate: 1 / 100,
};

const outputFilename = Deno.args[0].split(".")[0] + ".json";
const inputFileName = Deno.args[0];

try {
  const html = await readTXT(inputFileName);
  const $ = await cheerio.load(html);

  const tables = $(".table-responsive");
  let keys: string[] = [];
  const rawData = tables
    .map((i, table) => {
      // loop over each table separately so as to be able to skip the header rows.

      const singleTableRows = $(table)
        .find("tbody>tr")
        .map((j, row) => {
          if (
            j === 0 // assume the first row of each table is its keys, as they're inconsistent in using <th>
          ) {
            if (
              keys.length === 0
              // and only populate keys from the first table;
              // they're all the same save for some awful formatting in old ones.
              // 2000-2009 is missing the "Year" header. All the others have
              // nonprintable whitespace characters.
              // this assumption is easy to remove if this changes.
            ) {
              keys = $(row)
                .find("th,td")
                .map((_, header) =>
                  $(header).text().replace(/\s+/g, " ").trim()
                )
                .get();
            }

            // but skip the known non-data row anyway.
            return;
          }

          // extract the values from table i.
          const columns = $(row).find("td");
          const values = columns
            .map((_, col) => {
              return $(col).text().replace(/\s+/g, " ").trim();
            })
            .get();

          // spot check that values and keys are sane. throw for human review if not.
          if (values.length === 0 || values.length !== keys.length) {
            throw new Error(
              "Something has changed with table " +
                i +
                " at row " +
                j +
                ". Found " +
                values.length +
                " values, but have " +
                keys.length +
                " keys to fill."
            );
          }

          // zip it all back together.
          return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
        })
        .get();

      return singleTableRows;
    })
    .get();

  console.log("Successfully processed raw data into ", rawData.length, "rows.");

  // cleanup raw data.
  const data = rawData.map((row) => {
    if (typeof row !== "object" || row === null)
      throw new Error("Row is not an object.");

    return Object.fromEntries(
      Object.entries(row).map(([k, v]) => {
        // rename all fields per the FIELD_MAP
        const newKey = FIELD_MAP[k] ?? k;
        let newValue = v;

        // TODO: because of the floating point error introduced here, we could imagine
        // an end user preferring the raw string values. Return these as well.

        if (typeof newValue === "string") {
          // convert numbers to numeric types.
          // strip dollar signs, commas
          // NOTE: stripping % here probably indicates a bug unless we have handled
          // the percentage in the convert percentages rules below this.
          newValue = parseFloat(
            newValue.replace(/[$,%]/g, "").replace(/\s+/g, " ").trim()
          );

          // convert percentages to their raw values
          if (newKey in FIELD_MULTIPLIERS) {
            newValue = newValue * FIELD_MULTIPLIERS[newKey];
          }
        }

        return [newKey, newValue];
      })
    );
  });

  await writeJSON("./data/" + outputFilename, data, null, 2);
  await removeFile(inputFileName);
} catch (error) {
  console.log(error);
}
