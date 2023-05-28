import { runner, defaultProcessor, defaultCleaner } from "../lib/runner.ts";

const TABLE_HEADER = "TFSA dollar";
const selector = `caption:contains('${TABLE_HEADER}')`;
const keys: string[] = ["year", "limit"];

await runner(Deno.args[0], defaultProcessor(selector, keys), defaultCleaner());
