import {
  writeJSON,
  readTXT,
  removeFile,
} from "https://deno.land/x/flat@0.0.14/mod.ts";
import { cheerio, Cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";
import { cleanHeader, cleanCell, cleanRawData } from "./cleaners.ts";

export async function runner(
  dataFile: string,
  selector: string,
  fieldMap: { [key: string]: string } = {},
  fieldMultipliers: { [key: string]: number } = {},
  options = {
    removeFile: false,
  }
) {
  const outputFilename = dataFile.split(".")[0] + ".json";
  const inputFileName = dataFile;

  console.log("Beginning run for", dataFile);
  try {
    const html = await readTXT(inputFileName);

    const rawData = await processTable(html, selector);
    console.log(
      "Successfully processed raw data into",
      rawData.length,
      "rows."
    );
    // cleanup raw data.
    const data = cleanRawData(rawData, fieldMap, fieldMultipliers);

    await writeJSON("./data/" + outputFilename, data, null, 2);

    if (options.removeFile) await removeFile(inputFileName);
  } catch (error) {
    console.log(error);
  }
}

export async function processTable(
  html: string,
  tableSelector: string | Cheerio,
  rowSelector = "tbody>tr",
  headerSelector = "th",
  cellSelector = "th,td"
): Promise<{ [key: string]: string }[]> {
  const $ = await cheerio.load(html);

  function extractKeys(rows: Cheerio): string[] {
    return $(rows[0])
      .find(headerSelector)
      .map((_, header) => cleanHeader($(header)))
      .get();
  }

  const table = $(tableSelector).closest("table");
  const rows = table.find(rowSelector);

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

  let keys: string[] = extractKeys(rows);
  return rows
    .map((j, row) => {
      if (j === 0) return;

      const columns = $(row).find(cellSelector);
      const values = columns.map((_, col) => cleanCell($(col))).get();

      // spot check that values and keys are sane. throw for human review if not.
      if (values.length === 0 || values.length !== keys.length) {
        throw new Error(
          "Something has changed with the " +
            import.meta.url +
            " table at row " +
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
}
