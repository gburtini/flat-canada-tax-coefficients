export type DataRow = Record<string, unknown>;

export function ensureExtend(
  candidateData: DataRow[],
  existingData: DataRow[],
  key = "year",
) {
  // ensure that the candidate data doesn't drop rows from the existing dataset.
  // TODO: figure out how to also ensure that *keys* aren't dropped in the future.

  const resultingData = [...candidateData];

  existingData.forEach((oldRow) => {
    const newRow = resultingData.find((newRow) => newRow[key] === oldRow[key]);
    if (!newRow) {
      resultingData.push(oldRow);
    }
  });

  // TODO: do we need to sort now? What's the implicit order here?
  //resultingData.sort((a, b) => a[key] - b[key]);
  return resultingData;
}
