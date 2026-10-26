export type DataRow = Record<string, unknown>;

export function ensureExtend(
  candidateData: DataRow[],
  existingData: DataRow[],
  keys: readonly string[] = ["year"],
) {
  if (candidateData.length === 0 || keys.length === 0) {
    throw new Error(
      "A refresh needs non-empty data and explicit identity keys.",
    );
  }
  const identity = (row: DataRow): string =>
    JSON.stringify(keys.map((key) => {
      const value = row[key];
      if (
        value !== null && typeof value !== "string" &&
        !(typeof value === "number" && Number.isFinite(value))
      ) {
        throw new Error(`Missing or invalid identity field: ${key}`);
      }
      return value;
    }));
  const candidates = Map.groupBy(candidateData, identity);
  const existing = Map.groupBy(existingData, identity);
  const result: DataRow[] = [];
  for (const [key, rows] of candidates) {
    const oldRows = existing.get(key);
    // A scalar coefficient refresh must retain fields contributed by a second
    // source (CPP2). Multi-row groups replace the entire bracket schedule.
    result.push(
      ...(rows.length === 1 && oldRows?.length === 1
        ? [{ ...oldRows[0], ...rows[0] }]
        : rows),
    );
  }
  for (const [key, rows] of existing) {
    if (!candidates.has(key)) result.push(...rows);
  }
  return result;
}
