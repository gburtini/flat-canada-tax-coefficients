import {
  writeJSON,
  readTXT,
  removeFile,
} from "https://deno.land/x/flat@0.0.14/mod.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";

const outputFilename = Deno.args[0].split(".")[0] + ".json";
const inputFileName = Deno.args[0];

try {
  const html = await readTXT(inputFileName);
  const $ = await cheerio.load(html);

  const TABLE_HEADER = "TFSA dollar";
  const table = $(`caption:contains('${TABLE_HEADER}')`).parent("table");
  const rows = table.find("tbody>tr");

  if (table.length !== 1)
    throw new Error(
      "Expected exactly one matching table on the TFSA limit page, but found " +
        table.length
    );
  if (rows.length < 1)
    // no header row here.
    throw new Error(
      "Expected at least one matching data row on the TFSA limit page. Something has changed for the worse."
    );
  if (rows.length < 14)
    console.warn(
      "We expected to find more data than at development time (14 rows), but only found",
      rows.length,
      "rows."
    );

  let keys: string[] = ["year", "limit"];
  const data = rows
    .map((j, row) => {
      const columns = $(row).find("th,td"); // years are th
      const values = columns
        .map((_, col) => {
          const newValue = $(col).text().replace(/\s+/g, " ").trim();
          return parseFloat(
            newValue.replace(/[$,%]/g, "").replace(/\s+/g, " ").trim()
          );
        })
        .get();

      // spot check that values and keys are sane. throw for human review if not.
      if (values.length === 0 || values.length !== keys.length) {
        throw new Error(
          "Something has changed with the TFSA table at row " +
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

  console.log("Successfully processed data into ", data.length, "rows.");

  await writeJSON("./data/" + outputFilename, data, null, 2);
  await removeFile(inputFileName);
} catch (error) {
  console.log(error);
}
