import {
  writeJSON,
  readJSON,
  readTXT,
  removeFile,
} from "https://deno.land/x/flat@0.0.15/mod.ts";
import { cheerio, Cheerio } from "https://deno.land/x/cheerio@1.0.7/mod.ts";
import { cleanHeader, cleanCell, cleanRawData } from "./cleaners.ts";
import { ensureExtend } from "./combiners.ts";

// T is usually {[key:string]: string}
export async function runner<T>(
  dataFile: string,
  processor: (html: string) => Promise<T[]>, // TODO: processor would be clearer as "extractor"; processors are the whole end-to-end execution.
  cleaner: ((data: T[]) => Promise<any[]>) | null,
  options = {
    removeFile: false,
  }
) {
  const outputFilename = dataFile.split(".")[0] + ".json";
  const inputFileName = dataFile;

  console.log("Beginning run for", dataFile);
  try {
    const html = await readTXT(inputFileName);

    const rawData = await processor(html);
    console.log(
      "Successfully processed raw data into",
      rawData.length,
      "rows."
    );

    // cleanup raw data.
    const data = cleaner ? await cleaner(rawData) : rawData;
    if (cleaner)
      console.log("Successfully cleaned data into", data.length, "rows.");
    else console.log("No cleaning requested.");

    // do whatever combination rules are necessary with the existing data
    const path = "./data/" + outputFilename;
    const existingData = await readJSON(path);
    console.log("Found existing data", existingData.length, "rows.");

    // TODO: this should probably be an optional argument (combiner) as well.
    const combinedData = ensureExtend(data, existingData);
    console.log("Applied combiner and got", combinedData.length, "rows.");

    //
    await writeJSON(path, combinedData, null, 2);
    console.log("Wrote updated data to", path);

    // clean up after yourself. maybe. TODO: else, archive it?
    if (options.removeFile) await removeFile(inputFileName);
  } catch (error) {
    console.log(error);
  }
}

export function defaultProcessor(
  selector: string | Cheerio,
  ...moreArgs: any[]
) {
  return async (html: string) => {
    return await processTable(html, selector, ...moreArgs);
  };
}

export function defaultCleaner(
  fieldMap: { [key: string]: string } = {},
  fieldMultipliers: { [key: string]: number } = {}
) {
  return async (rawData: { [key: string]: string }[]) => {
    return cleanRawData(rawData, fieldMap, fieldMultipliers);
  };
}

export async function processTable(
  html: string,
  tableSelector: string | Cheerio,
  keys: string[] | null = null, // if keys are provided, we assume the table doesn't have a header row; otherwise use the transformers.
  skipHeader: boolean | null = null, // if null, derive from presence of keys.
  rowSelector = "tr", // ideally more sane, (tbody>tr and thead>th) but sometimes they use thead appropriately and sometimes they don't. frustrating.
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

  const table = $(tableSelector);
  const rows = table.find(rowSelector);
  const skippingHeader = skipHeader === null ? keys !== null : skipHeader;

  if (table.length !== 1)
    throw new Error("Expected exactly one table, but found " + table.length);
  if (rows.length < (skippingHeader ? 1 : 2))
    throw new Error(
      "Expected at least one data row and one header row. Something has changed for the worse."
    );

  const appliedKeys = keys !== null ? keys : extractKeys(rows);
  return rows
    .map((j, row) => {
      // only skip the first row if it is the headers (keys aren't provided)
      if (skippingHeader && j === 0) return;

      const columns = $(row).find(cellSelector);
      const values = columns.map((_, col) => cleanCell($(col))).get();

      // spot check that values and keys are sane. throw for human review if not.
      if (values.length === 0 || values.length !== appliedKeys.length) {
        throw new Error(
          "Something has changed at row " +
            j +
            ". Found " +
            values.length +
            " values, but have " +
            appliedKeys.length +
            " keys to fill."
        );
      }

      // zip it all back together.
      return Object.fromEntries(appliedKeys.map((k, i) => [k, values[i]]));
    })
    .get();
}
