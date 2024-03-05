import { runner, defaultProcessor, defaultCleaner } from "../lib/runner.ts";

const TABLE_HEADER = "TFSA and ALDA dollar limits";
const selector = `table:has(caption>strong:contains('${TABLE_HEADER}'))`;
const keys: string[] = ["year", "limit", "alda"];

await runner(Deno.args[0], defaultProcessor(selector, keys), defaultCleaner());
