import assert from "node:assert/strict";
import { ensureExtend } from "./combiners.ts";

Deno.test("CPP refresh retains fields supplied by the CPP2 source", () => {
  assert.deepEqual(
    ensureExtend(
      [{ year: 2026, ympe: 74600 }],
      [{ year: 2026, ympe: 71300, cpp2: 85000 }, { year: 2025, ympe: 71300 }],
    ),
    [{ year: 2026, ympe: 74600, cpp2: 85000 }, { year: 2025, ympe: 71300 }],
  );
});

Deno.test("personal refresh preserves other jurisdictions and periods in the same year", () => {
  const keys = ["name", "year", "period"];
  const old = [
    { name: "BC", year: 2026, period: null, rate: 0.05 },
    { name: "AB", year: 2026, period: null, rate: 0.08 },
    { name: "BC", year: 2026, period: "July", rate: 0.06 },
  ];
  const current = [{ name: "BC", year: 2026, period: null, rate: 0.07 }];
  assert.deepEqual(ensureExtend(current, old, keys), [
    current[0],
    old[1],
    old[2],
  ]);
});

Deno.test("a changed bracket schedule replaces its whole group", () => {
  const old = [
    { name: "BC", year: 2026, threshold: 0 },
    { name: "BC", year: 2026, threshold: 45000 },
  ];
  const current = [
    { name: "BC", year: 2026, threshold: 0 },
    { name: "BC", year: 2026, threshold: 50000 },
  ];
  assert.deepEqual(ensureExtend(current, old, ["name", "year"]), current);
});

Deno.test("RRIF refresh uses age identity and retains missing ages", () => {
  assert.deepEqual(
    ensureExtend([{ age: 71, factor: 0.0528 }], [
      { age: 71, factor: 0.05 },
      { age: 72, factor: 0.054 },
    ], ["age"]),
    [{ age: 71, factor: 0.0528 }, { age: 72, factor: 0.054 }],
  );
});

Deno.test("empty refreshes and absent identities fail before merging", () => {
  assert.throws(() => ensureExtend([], [{ year: 2026 }]));
  assert.throws(() => ensureExtend([{ age: 71 }], [{ age: 72 }]));
});
