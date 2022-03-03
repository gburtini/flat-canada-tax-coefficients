export function ensureExtend(candidateData, existingData, key = "year") {
  // ensure that the candidate data doesn't drop any data off the existing dataset.
  // TODO: figure out how to also ensure that keys aren't dropped in the future.

  const resultingData = [...candidateData];

  existingData.forEach((oldRow) => {
    const newRow = resultingData.find((newRow) => newRow[key] === oldRow[key]);
    if (!newRow) {
      resultingData.push(oldRow);
    }
  });

  resultingData.sort((a, b) => a[key] - b[key]);
  return resultingData;
}
