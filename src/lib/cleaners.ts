import { Cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";

export function cleanNumber(s: string) {
  const multiplier = s.trim().endsWith("%") ? 1 / 100 : 1;
  return (
    parseFloat(s.replace(/[$,%]/g, "").replace(/\s+/g, " ").trim()) * multiplier
  );
}

export function cleanHeader(cell: Cheerio, removeSelector = "sup") {
  // small mess to remove the <sup> tags or other non-header text in <th> cells.
  return cell
    .clone()
    .children(removeSelector)
    .remove()
    .end()
    .text()
    .replace(/[\n\s]+/g, " ")
    .trim();
}

export function cleanCell(cell: Cheerio) {
  return cell.text().replace(/\s+/g, " ").trim();
}

// TODO: this function does entirely too much stuff. It should be broken up into three functions.
export function cleanRawData(
  rawData: { [key: string]: string }[],
  fieldMap: { [key: string]: string } = {},
  fieldMultipliers: { [key: string]: number } = {}
) {
  return rawData.map((row) => {
    if (typeof row !== "object" || row === null)
      throw new Error("Row is not an object.");

    return Object.fromEntries(
      Object.entries(row).map(([k, v]) => {
        // rename all fields per the FIELD_MAP
        const newKey = fieldMap[k] ?? k;
        let newValue: number | string = v;

        // TODO: because of the floating point error introduced here, we could imagine
        // an end user preferring the raw string values. Return these as well.
        // for this file, there's meaningful text in some of the values too, currently cast to null.

        if (typeof newValue === "string") {
          // convert numbers to numeric types.
          // strip dollar signs, commas
          // NOTE: stripping % here probably indicates a bug unless we have handled
          // the percentage in the convert percentages rules below this.
          newValue = cleanNumber(newValue);

          // convert percentages to their raw values
          if (newKey in fieldMultipliers) {
            newValue = newValue * fieldMultipliers[newKey];
          }
        }

        return [newKey, newValue];
      })
    );
  });
}

export function cleanTaxRateString(str: string): {
  rate: number;
  rules: [string, number][];
} {
  const PREPEND_WORDS: { [key: string]: string } = {
    "on the first": "<=",
    "on the next": "<+",
    over: ">",
    "is more than": ">",
    "but not more than": "<=",
    "up to": "<=",
  };
  const APPEND_WORDS: { [key: string]: string } = { "or less": "<=" };

  const rate = str.match(/([\d\.]+)\%/g);
  if (!rate || rate.length !== 1) {
    throw new Error(
      "Tried to process a rate from a string that doesn't match the expected format."
    );
  }
  const foundRate = cleanNumber(rate[0]);

  const thresholdRegex = "\\$?([\\d,\\.]+\\d)";
  const rules = [];
  console.log(str);
  for (const word of Object.keys(PREPEND_WORDS)) {
    const results = str.match(new RegExp(word + "\\s+" + thresholdRegex));

    console.log(word, results);
    if (results) {
      rules.push([PREPEND_WORDS[word], cleanNumber(results[1])] as [
        string,
        number
      ]);
    }
  }

  for (const word of Object.keys(APPEND_WORDS)) {
    const results = str.match(new RegExp(thresholdRegex + "\\s+" + word));

    if (results) {
      rules.push([APPEND_WORDS[word], cleanNumber(results[1])] as [
        string,
        number
      ]);
    }
  }

  if (rules.length === 0)
    throw new Error(
      "Tried to process a rate from a string that has no thresholds: " + str
    );

  // TODO: reduce and look for contradictions in the rules.

  return {
    rules,
    rate: foundRate,
  };

  /*
    processRate("15% on the first $50,197 of taxable income, plus");
    processRate(
      "20.5% on the next $50,195 of taxable income (on the portion of taxable income over 50,197 up to $100,392), plus"
    );
    processRate(
      "9.8% on the portion of your taxable income that is $31,984 or less, plus"
    );
    processRate(
      "13.8% on the portion of your taxable income that is more than $31,984 but not more than $63,969, plus"
    );
    processRate(
      "16.7% on the portion of your taxable income that is more than $63,969"
    );

    console.log(
      cleanTaxRateString(
        "20.3% on the portion of your taxable income that is more than $166,280"
      )
    );

  */
}
