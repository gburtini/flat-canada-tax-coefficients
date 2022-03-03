import {
  writeJSON,
  readTXT,
  removeFile,
} from "https://deno.land/x/flat@0.0.14/mod.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";

const FIELD_MAP: { [key: string]: string } = {
  Year: "year",
  "MP limit": "mpLimit",
  "DB limit": "dbLimit",
  "RRSP dollar limit": "rrspLimit",
  "DPSP limit (1/2 MP limit)": "dpspLimit",
  "ALDA dollar limit": "aldaLimit",
  YMPE: "ympe",
};
const FIELD_MULTIPLIERS: { [key: string]: number } = {};

const outputFilename = Deno.args[0].split(".")[0] + ".json";
const inputFileName = Deno.args[0];

try {
  const html = await readTXT(inputFileName);
  const $ = await cheerio.load(html);

  const TABLE_HEADER = "MP, DB, RRSP, DPSP, ALDA, TFSA limits and the YMPE.";
  const table = $(`caption:contains('${TABLE_HEADER}')`).parent("table");
  const rows = table.find("tbody>tr");

  if (table.length !== 1)
    throw new Error(
      "Expected exactly one table on the pensions limit page, but found " +
        table.length
    );
  if (rows.length < 2)
    throw new Error(
      "Expected at least one data row on the pensions limit page. Something has changed for the worse."
    );
  if (rows.length < 35)
    console.warn(
      "We expected to find more data than at development time (35 rows), but only found",
      rows.length,
      "rows."
    );

  let keys: string[] = [];
  const rawData = rows
    .map((j, row) => {
      if (j === 0) {
        keys = $(row)
          .find("th")
          .map((_, header) =>
            $(header).text().replace(/\s+/g, " ").replace(/\n/, " ").trim()
          )
          .get();

        // skip the known non-data row.
        return;
      }

      const columns = $(row).find("th,td"); // years are th
      const values = columns
        .map((_, col) => {
          return $(col).text().replace(/\s+/g, " ").trim();
        })
        .get();

      // spot check that values and keys are sane. throw for human review if not.
      if (values.length === 0 || values.length !== keys.length) {
        throw new Error(
          "Something has changed with the pensions limits table at row " +
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

  console.log("Successfully processed raw data into ", rawData.length, "rows.");

  // TODO: raw data cleanup is *verbatim* from CPP.ts. This should be at least partially abstracted.
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
        // for this file, there's meaningful text in some of the values too, currently cast to null.

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
