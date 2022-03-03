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
