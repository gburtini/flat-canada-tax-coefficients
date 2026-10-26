import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);

Deno.test("all retained CRA snapshots reproduce the committed coefficients", async () => {
  const directory = await Deno.makeTempDir({ prefix: "coefficient-fixtures-" });
  try {
    await Deno.mkdir(`${directory}/data`);
    for (const dataset of ["cpp", "pensions", "personal", "rrif", "tfsa"]) {
      await Deno.copyFile(
        new URL(`data/${dataset}.json`, root),
        `${directory}/data/${dataset}.json`,
      );
    }
    for (
      const processor of ["cpp", "cpp2", "pensions", "tfsa", "rrif", "personal"]
    ) {
      const command = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--config",
          fileURLToPath(new URL("deno.json", root)),
          "--allow-read",
          "--allow-write",
          fileURLToPath(new URL(`src/processors/${processor}.ts`, root)),
          fileURLToPath(new URL(`raw/${processor}.html`, root)),
        ],
        cwd: directory,
        stdout: "piped",
        stderr: "piped",
      });
      const output = await command.output();
      assert.equal(output.code, 0, new TextDecoder().decode(output.stderr));
    }
    for (const dataset of ["cpp", "pensions", "personal", "rrif", "tfsa"]) {
      const expected: unknown = JSON.parse(
        await Deno.readTextFile(new URL(`data/${dataset}.json`, root)),
      );
      const actual: unknown = JSON.parse(
        await Deno.readTextFile(`${directory}/data/${dataset}.json`),
      );
      assert.deepEqual(
        actual,
        expected,
        `${dataset} changed after replaying its snapshot`,
      );
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
