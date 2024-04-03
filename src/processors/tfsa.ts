import { runner, defaultProcessor, defaultCleaner } from "../lib/runner.ts";

const TABLE_HEADER = "TFSA and ALDA dollar limits"; // Updated table header to match the webpage
const selector = `caption:contains('${TABLE_HEADER}')`;
const keys: string[] = ["year", "TFSA dollar limit"]; // Updated to match the column names in the table

await runner(Deno.args[0], defaultProcessor(selector, keys), defaultCleaner());
