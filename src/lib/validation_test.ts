import assert from "node:assert/strict";
import { cleanNumber, cleanRawData } from "./cleaners.ts";
import { assertJsonNumbers, validateDataset } from "./validation.ts";

Deno.test("non-finite values cannot silently become JSON null", () => {
  assert.throws(() => assertJsonNumbers([{ year: 2026, amount: NaN }]));
  assert.throws(() => assertJsonNumbers([{ nested: [Infinity] }]));
  assert.doesNotThrow(() => assertJsonNumbers([{ amount: null }]));
});

Deno.test("CRA decimal-comma money values preserve their decimal places", () => {
  assert.equal(cleanNumber("49,720,00"), 49720);
  assert.equal(cleanNumber("$49,720.00"), 49720);
  assert.equal(cleanNumber("14%"), 0.14);
});

Deno.test("explicit missing values are distinguished from parsing failures", () => {
  assert.deepEqual(
    cleanRawData([{ value: "n/a" }, { value: "(Old limits)" }]),
    [{ value: null }, { value: null }],
  );
  assert.throws(() =>
    assertJsonNumbers(cleanRawData([{ value: "unexpected source text" }]))
  );
});

Deno.test("empty tables, missing required fields and incomplete RRIF data fail", () => {
  assert.throws(() => validateDataset("cpp.json", []));
  assert.throws(() => validateDataset("cpp.json", [{ year: 2026 }]));
  assert.throws(() =>
    validateDataset("rrif.json", [{
      age: 71,
      preMarch1986Factor: 0.05,
      qualifyingFactor: 0.05,
      allOtherFactor: 0.05,
    }])
  );
});

Deno.test("overlapping personal tax brackets fail", () => {
  assert.throws(() =>
    validateDataset("personal.json", [
      {
        name: "federal",
        year: 2026,
        period: null,
        rate: { rate: 0.14, rules: [["<=", 100]] },
      },
      {
        name: "federal",
        year: 2026,
        period: null,
        rate: { rate: 0.20, rules: [[">", 50]] },
      },
    ]), /Gap or overlap/);
});
