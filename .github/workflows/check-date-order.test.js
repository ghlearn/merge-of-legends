const assert = require("assert");
const { parseDatesFromText, isChronological, countNotAscending } = require("./check-date-order");

// Manually run these tests in the CLI:
// node /workspaces/repos/ghlearn/merge-of-legends/.github/workflows/check-date-order.test.js

function datesToYYYYMM(dates) {
  return dates.map((d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
}

// parseDatesFromText: Empty text
(() => {
  // Act
  const emptyParse = parseDatesFromText("");

  // Assert
  assert.deepStrictEqual(emptyParse, []);
})();

// parseDatesFromText: Basic extraction and order preservation
(() => {
  // Arrange
  const text = `
  2007-09 random content
  something without a date
  2008-02 and 
  2008-04`;

  // Act
  const parsed = parseDatesFromText(text);

  // Assert
  assert.deepStrictEqual(datesToYYYYMM(parsed), ["2007-09", "2008-02", "2008-04"]);
})();

// parseDatesFromText: Noise, duplicates, out of order
(() => {
  // Arrange
  const text = `   noise. dfefe 2010-04, (*&$#($#$#
  2008-10 text 2010-04 `;

  // Act
  const parsed = parseDatesFromText(text);

  // Assert
  assert.deepStrictEqual(datesToYYYYMM(parsed), ["2010-04", "2008-10", "2010-04"]);
})();

// parseDatesFromText: Invalid dates should be ignored
(() => {
  // Arrange
  const text = `bad 2020-00 '2020-13' 2020-01
  good 2021-12
  bad 2021-99`;

  // Act
  const parsed = parseDatesFromText(text);

  // Assert (parsing only)
  assert.deepStrictEqual(datesToYYYYMM(parsed), ["2020-01", "2021-12"]);
})();

// parseDatesFromText: Multiline content similar to real example content
(() => {
  // Arrange
  const text = `## A markdown header
    Some preamble content
    ## A subheader

    ---
    config:
      theme: 'base'
      gitGraph:
        showBranches: false
        rotateCommitLabel: false
    ---
    gitGraph TB:

    branch release-1
    commit id: "2022-08" tag: "Codespaces"
    commit id: "2023-02" tag: "Copilot Business"
    commit id: "2024-02" tag: "Copilot Enterprise"
    commit id: "2025-07" tag: "Copilot coding agent"
    checkout main
    merge 4-copilot-enablement tag: "copilot"
  `;

  // Act
  const parsed = parseDatesFromText(text);

  // Assert
  const expected = ["2022-08", "2023-02", "2024-02", "2025-07"];
  assert.deepStrictEqual(datesToYYYYMM(parsed), expected);
})();

// isChronological: Ascending order
(() => {
  // Arrange
  const arr = [
    // Ascending order
    new Date(Date.UTC(2019, 0, 1)),
    new Date(Date.UTC(2019, 1, 1)),
  ];

  // Act
  const result = isChronological(arr);

  // Assert
  assert.strictEqual(result, true);
})();

// isChronological: Not ascending order
(() => {
  // Arrange
  const arr = [
    // Ascending order
    new Date(Date.UTC(2019, 1, 1)),
    new Date(Date.UTC(2019, 0, 1)),
  ];

  // Act
  const result = isChronological(arr);

  // Assert
  assert.strictEqual(result, false);
})();

// isChronological: Mixed array with non-dates
(() => {
  // Arrange
  const arr = [
    // Mixed list
    new Date(Date.UTC(2019, 0, 1)),
    "not-a-date",
    new Date(Date.UTC(2019, 1, 1)),
    new Date(Date.UTC(2020, 9, 1)),
    new Date(Date.UTC(2022, 3, 1)),
  ];

  // Act
  const result = isChronological(arr);

  // Assert
  assert.strictEqual(result, true);
})();

// isChronological: Empty array
(() => {
  // Act
  const result = isChronological([]);

  // Assert
  assert.strictEqual(result, true);
})();

// isChronological: Single non-date in array
(() => {
  // Act
  const result = isChronological(["not-a-date"]);

  // Assert
  assert.strictEqual(result, true);
})();

// isChronological: Single date in array
(() => {
  // Act
  const result = isChronological([new Date()]);

  // Assert
  assert.strictEqual(result, true);
})();

// countNotAscending: empty array
(() => {
  // Arrange
  const arr = [];

  // Act
  const result = countNotAscending(arr);

  // Assert
  assert.strictEqual(result, 0);
})();

// countNotAscending: 1 item
(() => {
  // Arrange
  const arr = [new Date(Date.UTC(2018, 0, 1))];

  // Act
  const result = countNotAscending(arr);

  // Assert
  assert.strictEqual(result, 0);
})();

// countNotAscending: 2 mistakes
(() => {
  // Arrange
  const arr = [
    // Mixed list
    new Date(Date.UTC(2018, 0, 1)),
    new Date(Date.UTC(2019, 1, 1)),
    new Date(Date.UTC(2017, 1, 1)), // Out of order
    new Date(Date.UTC(2020, 1, 1)),
    new Date(Date.UTC(2013, 1, 1)), // Out of order
    new Date(Date.UTC(2022, 1, 1)),
  ];

  // Act
  const result = countNotAscending(arr);

  // Assert
  assert.strictEqual(result, 2);
})();

// countNotAscending: correct order
(() => {
  // Arrange
  const arr = [
    // Mixed list
    new Date(Date.UTC(2013, 1, 1)),
    new Date(Date.UTC(2017, 1, 1)),
    new Date(Date.UTC(2018, 0, 1)),
    new Date(Date.UTC(2019, 1, 1)),
    new Date(Date.UTC(2020, 1, 1)),
    new Date(Date.UTC(2022, 1, 1)),
  ];

  // Act
  const result = countNotAscending(arr);

  // Assert
  assert.strictEqual(result, 0);
})();

// countNotAscending: reverse order (all wrong)
(() => {
  // Arrange
  const arr = [
    // Mixed list
    new Date(Date.UTC(2022, 1, 1)),
    new Date(Date.UTC(2020, 1, 1)),
    new Date(Date.UTC(2019, 1, 1)),
    new Date(Date.UTC(2018, 0, 1)),
    new Date(Date.UTC(2017, 1, 1)),
    new Date(Date.UTC(2013, 1, 1)),
  ];

  // Act
  const result = countNotAscending(arr);

  // Assert
  assert.strictEqual(result, 5);
})();

// If nothing threw an exception, all tests passed
console.log("All tests passed");
