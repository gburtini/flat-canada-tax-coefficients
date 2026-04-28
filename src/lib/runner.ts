import * as cheerio from "npm:cheerio@1.0.0-rc.12";
import type { AnyNode, Cheerio } from "npm:cheerio@1.0.0-rc.12";
import { cleanCell, cleanHeader, cleanRawData } from "./cleaners.ts";
import { DataRow, ensureExtend } from "./combiners.ts";

type TableRow = Record<string, string>;
type RunnerOptions = {
  removeFile: boolean;
};
type ProcessTableArgs = [
  keys?: string[] | null,
  skipHeader?: boolean | null,
  rowSelector?: string,
  headerSelector?: string,
  cellSelector?: string,
];

// T is usually {[key:string]: string}
export async function runner<RawRow extends DataRow>(
  dataFile: string,
  processor: (html: string) => Promise<RawRow[]>, // TODO: processor would be clearer as "extractor"; processors are the whole end-to-end execution.
  cleaner: ((data: RawRow[]) => Promise<DataRow[]>) | null,
  options: RunnerOptions = {
    removeFile: false,
  },
): Promise<void> {
  const fileName = dataFile.split("/").pop() ?? dataFile;

  const outputFilename = fileName.split(".")[0] + ".json";
  const inputFileName = dataFile;

  console.log("Beginning run for", dataFile);
  try {
    const html = await readTXT(inputFileName);

    const rawData = await processor(html);
    console.log(
      "Successfully processed raw data into",
      rawData.length,
      "rows.",
    );

    // cleanup raw data.
    const data = cleaner ? await cleaner(rawData) : rawData;
    if (cleaner) {
      console.log("Successfully cleaned data into", data.length, "rows.");
    } else console.log("No cleaning requested.");

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
    console.error(error);

    Deno.exit(1);
  }
}

export async function readJSON(path: string): Promise<DataRow[]> {
  const parsed: unknown = JSON.parse(await Deno.readTextFile(path));
  if (!Array.isArray(parsed) || !parsed.every(isDataRow)) {
    throw new Error(`Expected ${path} to contain an array of objects.`);
  }

  return parsed;
}

export async function writeJSON(
  path: string,
  data: DataRow[],
  _replacer: null = null,
  space = 2,
): Promise<void> {
  await Deno.writeTextFile(path, `${JSON.stringify(data, _replacer, space)}\n`);
}

async function readTXT(path: string): Promise<string> {
  return await Deno.readTextFile(path);
}

async function removeFile(path: string): Promise<void> {
  await Deno.remove(path);
}

export function defaultProcessor(
  selector: string | Cheerio<AnyNode>,
  ...moreArgs: ProcessTableArgs
) {
  return async (html: string) => {
    return await processTable(html, selector, ...moreArgs);
  };
}

export function defaultCleaner(
  fieldMap: { [key: string]: string } = {},
  fieldMultipliers: { [key: string]: number } = {},
) {
  return async (rawData: TableRow[]) => {
    return cleanRawData(rawData, fieldMap, fieldMultipliers);
  };
}

export async function processTable(
  html: string,
  tableSelector: string | Cheerio<AnyNode>,
  keys: string[] | null = null, // if keys are provided, we assume the table doesn't have a header row; otherwise use the transformers.
  skipHeader: boolean | null = null, // if null, derive from presence of keys.
  rowSelector = "tr", // ideally more sane, (tbody>tr and thead>th) but sometimes they use thead appropriately and sometimes they don't. frustrating.
  headerSelector = "th",
  cellSelector = "th,td",
): Promise<TableRow[]> {
  const $ = await cheerio.load(html);

  function extractKeys(rows: Cheerio<AnyNode>): string[] {
    return $(rows[0])
      .find(headerSelector)
      .map((_, header) => cleanHeader($(header)))
      .get();
  }

  const table = $(tableSelector);
  const rows = table.find(rowSelector);
  const skippingHeader = skipHeader === null ? keys === null : skipHeader;

  if (table.length !== 1) {
    throw new Error("Expected exactly one table, but found " + table.length);
  }
  if (rows.length < (skippingHeader ? 2 : 1)) {
    throw new Error(
      "Expected at least one data row and one header row. Something has changed for the worse.",
    );
  }

  const appliedKeys = keys !== null ? keys : extractKeys(rows);
  const parsedRows: TableRow[] = [];
  for (const [j, row] of rows.toArray().entries()) {
    // only skip the first row if it is the headers (keys aren't provided)
    if (skippingHeader && j === 0) continue;

    const columns = $(row).find(cellSelector);
    const values = columns.map((_, col) => cleanCell($(col))).get();

    if (values.length === 0) {
      continue;
    }

    // spot check that values and keys are sane. throw for human review if not.
    if (values.length !== appliedKeys.length) {
      throw new Error(
        "Something has changed at row " +
          j +
          ". Found " +
          values.length +
          " values, but have " +
          appliedKeys.length +
          " keys to fill.",
      );
    }

    // zip it all back together.
    const result: TableRow = {};
    appliedKeys.forEach((key, i) => {
      result[key] = values[i];
    });
    parsedRows.push(result);
  }

  return parsedRows;
}

function isDataRow(value: unknown): value is DataRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
