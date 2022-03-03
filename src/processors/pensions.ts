import { runner, defaultProcessor, defaultCleaner } from "../lib/runner.ts";

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

const TABLE_HEADER = "MP, DB, RRSP, DPSP, ALDA, TFSA limits and the YMPE.";
const selector = `caption:contains('${TABLE_HEADER}')`;

await runner(
  Deno.args[0],
  defaultProcessor(selector),
  defaultCleaner(FIELD_MAP, FIELD_MULTIPLIERS),
  {
    removeFile: false,
  }
);
