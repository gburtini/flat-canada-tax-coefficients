import { runner, defaultProcessor, defaultCleaner } from "../lib/runner.ts";

const FIELD_MAP: { [key: string]: string } = {
  "Age of the RRIF annuitant or spouse or common-law partner": "age",
  "Pre-March 1986": "preMarch1986Factor",
  "Qualifying RRIFs": "qualifyingFactor",
  "All other RRIFs": "allOtherFactor",
};
const FIELD_MULTIPLIERS: { [key: string]: number } = {};

const TABLE_HEADER = "Prescribed factors";
const selector = `table:has(caption:contains('${TABLE_HEADER}'))`;

await runner(
  Deno.args[0],
  defaultProcessor(selector),
  defaultCleaner(FIELD_MAP, FIELD_MULTIPLIERS)
);
