import type { DataRow } from "./combiners.ts";

export function assertJsonNumbers(value: unknown, location = "data"): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`Non-finite numeric value at ${location}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item: unknown, index: number) =>
      assertJsonNumbers(item, `${location}/${index}`)
    );
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      assertJsonNumbers(item, `${location}/${key}`);
    }
  }
}

const fields: Readonly<Record<string, readonly string[]>> = {
  "cpp.json": [
    "year",
    "maximumAnnualPensionableEarnings",
    "basicExemptionAmount",
    "maximumContributoryEarnings",
    "employmentContributionRate",
    "maximumAnnualEmploymentContribution",
    "maximumAnnualSelfEmploymentContribution",
  ],
  "cpp2.json": [
    "year",
    "additionalMaximumAnnualPensionableEarnings",
    "secondAdditionalContributionRate",
    "maximumAnnualSecondAdditionalEmploymentContribution",
    "maximumAnnualSecondAdditionalSelfEmploymentContribution",
  ],
  "pensions.json": ["year", "mpLimit", "dbLimit", "dpspLimit", "ympe"],
  "tfsa.json": ["year", "limit"],
  "rrif.json": [
    "age",
    "preMarch1986Factor",
    "qualifyingFactor",
    "allOtherFactor",
  ],
};

export function validateDataset(name: string, rows: readonly DataRow[]): void {
  if (rows.length === 0) throw new Error(`${name} contains no data rows.`);
  assertJsonNumbers(rows, name);
  const identities = new Set<string>();
  for (const row of rows) {
    for (const field of fields[name] ?? ["year"]) {
      const value = row[field];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`${name} needs a non-negative numeric ${field}.`);
      }
    }
    const calendarKey = name === "rrif.json" ? "age" : "year";
    if (!Number.isInteger(row[calendarKey])) {
      throw new Error(`${name} needs an integer ${calendarKey}.`);
    }
    if (name !== "personal.json") {
      const identity = String(row[calendarKey]);
      if (identities.has(identity)) {
        throw new Error(`${name} repeats ${identity}.`);
      }
      identities.add(identity);
    }
  }
  const firstYear = name === "cpp.json"
    ? 1966
    : name === "tfsa.json"
    ? 2009
    : name === "pensions.json"
    ? 1990
    : name === "cpp2.json"
    ? 2024
    : undefined;
  if (firstYear !== undefined) {
    const years = rows.map((row) => row.year).filter((year): year is number =>
      typeof year === "number"
    );
    for (let year = firstYear; year <= Math.max(...years); year++) {
      if (!years.includes(year)) {
        throw new Error(`${name} is missing year ${year}.`);
      }
    }
  }
  if (name === "rrif.json") {
    for (let age = 71; age <= 95; age++) {
      if (!rows.some((row) => row.age === age)) {
        throw new Error(`RRIF is missing age ${age}.`);
      }
    }
  }
  if (name === "personal.json") validateSchedules(rows);
}

function validateSchedules(rows: readonly DataRow[]): void {
  const groups = new Map<string, { lower: number; upper: number | null }[]>();
  for (const row of rows) {
    if (
      typeof row.name !== "string" ||
      !(row.period === null || typeof row.period === "string")
    ) {
      throw new Error(
        "Personal tax rows need jurisdiction and period identity.",
      );
    }
    const rate = row.rate;
    if (
      typeof rate !== "object" || rate === null ||
      !("rate" in rate) || typeof rate.rate !== "number" ||
      rate.rate < 0 || rate.rate > 1 ||
      !("rules" in rate) || !Array.isArray(rate.rules)
    ) {
      throw new Error("Invalid personal tax rate.");
    }
    let lower = 0;
    let upper: number | null = null;
    const operators = new Set<string>();
    const rules: readonly unknown[] = rate.rules;
    for (const candidate of rules) {
      if (!Array.isArray(candidate)) {
        throw new Error("Invalid tax bracket rule.");
      }
      const rule: readonly unknown[] = candidate;
      if (
        !Array.isArray(rule) || rule.length !== 2 ||
        (rule[0] !== ">" && rule[0] !== "<=") ||
        typeof rule[1] !== "number" || !Number.isFinite(rule[1]) ||
        rule[1] < 0 ||
        operators.has(rule[0])
      ) throw new Error("Invalid tax bracket boundary.");
      operators.add(rule[0]);
      if (rule[0] === ">") lower = Math.round(rule[1] * 100);
      else upper = Math.round(rule[1] * 100);
    }
    if (operators.size === 0 || (upper !== null && upper <= lower)) {
      throw new Error("Empty personal tax bracket.");
    }
    const key = JSON.stringify([row.name, row.year, row.period]);
    const group = groups.get(key) ?? [];
    group.push({ lower, upper });
    groups.set(key, group);
  }
  for (const [key, group] of groups) {
    group.sort((a, b) => a.lower - b.lower);
    if (group[0].lower !== 0 || group.at(-1)?.upper !== null) {
      throw new Error(`Incomplete personal tax schedule: ${key}`);
    }
    for (let i = 1; i < group.length; i++) {
      if (group[i].lower !== group[i - 1].upper) {
        throw new Error(`Gap or overlap in personal tax schedule: ${key}`);
      }
    }
  }
  const latestYear = Math.max(
    ...rows.map((row) => typeof row.year === "number" ? row.year : 0),
  );
  for (
    const name of [
      "federal",
      "Alberta",
      "British Columbia",
      "Manitoba",
      "New Brunswick",
      "Newfoundland and Labrador",
      "Northwest Territories",
      "Nova Scotia",
      "Nunavut",
      "Ontario",
      "Prince Edward Island",
      "Saskatchewan",
      "Yukon",
    ]
  ) {
    if (!rows.some((row) => row.year === latestYear && row.name === name)) {
      throw new Error(`Latest personal tax schedules are missing ${name}.`);
    }
  }
}
