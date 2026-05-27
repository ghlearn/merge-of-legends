const assert = require("assert");
const {
  getCheckboxes,
  getCheckedValue,
  disableCheckboxes,
  rewriteRepoLocalImageUrls,
} = require("./actions-utils");

const { resetCheckboxes } = require("./actions-utils");
const { removeAlerts } = require("./actions-utils");

// Manually run these tests in the CLI:
// node /workspaces/repos/ghlearn/merge-of-legends/.github/workflows/actions-utils.test.js

// getCheckboxes: Empty
(() => {
  // Arrange
  const text = ``;

  // Act
  const checkboxes = getCheckboxes(text);

  // Assert
  assert.deepStrictEqual(checkboxes.length, 0);
})();

// getCheckboxes: Bad checkbox syntax
(() => {
  // Arrange
  const text = `
  Some text before
  - [x] 2007-09 random content
  something without a date
  - [] 2008-02
  - [] hello world
  `;

  // Act
  const checkboxes = getCheckboxes(text);

  // Assert
  assert.deepStrictEqual(checkboxes.length, 1);
})();

// getCheckboxes: 3 items, 1 checked
(() => {
  // Arrange
  const text = `
  Some text before
  - [x] 2007-09 random content
  something without a date
  - [ ] 2008-02
  - [ ] hello world
  `;

  // Act
  const checkboxes = getCheckboxes(text);

  // Assert
  assert.deepStrictEqual(checkboxes.length, 3);
  assert.deepStrictEqual(checkboxes[0][1], "x");
  assert.deepStrictEqual(checkboxes[0][2], "2007-09 random content");
  assert.deepStrictEqual(checkboxes[1][1], " ");
  assert.deepStrictEqual(checkboxes[1][2], "2008-02");
  assert.deepStrictEqual(checkboxes[2][1], " ");
  assert.deepStrictEqual(checkboxes[2][2], "hello world");
})();

// getCheckedValue: Output works as input
(() => {
  // Arrange
  const text = `
  Some text before
  - [x] hello
  - [ ] world
  - [ ] from around here
  `;
  const checkboxes = getCheckboxes(text);

  // Act
  const checkedValue = getCheckedValue(checkboxes);

  // Assert
  assert.deepStrictEqual(checkedValue, "hello");
})();

// getCheckedValue: Empty checkboxes array
(() => {
  // Arrange
  const checkboxes = [];

  // Act
  const checkedValue = getCheckedValue(checkboxes);

  // Assert
  assert.deepStrictEqual(checkedValue, null);
})();

// getCheckedValue: First item checked
(() => {
  // Arrange
  const checkboxes = [
    ["- [x] hello", "x", "hello"],
    ["- [ ] world", " ", "world"],
    ["- [ ] from around here", " ", "from around here"],
  ];

  // Act
  const checkedValue = getCheckedValue(checkboxes);

  // Assert
  assert.deepStrictEqual(checkedValue, "hello");
})();

// getCheckedValue: Second item checked
(() => {
  // Arrange
  const checkboxes = [
    ["- [ ] hello", " ", "hello"],
    ["- [x] world", "x", "world"],
    ["- [ ] from around here", " ", "from around here"],
  ];

  // Act
  const checkedValue = getCheckedValue(checkboxes);

  // Assert
  assert.deepStrictEqual(checkedValue, "world");
})();

// disableCheckboxes: basic conversion
(() => {
  // Arrange
  const text = `
  - [ ] Item 1
  - [x] Item 2
  - [ ] Item 3
  `;

  // Act
  const converted = disableCheckboxes(text);

  // Assert
  const expected = `
  ⬜️ Item 1
  ✅ Item 2
  ⬜️ Item 3
  `;

  assert.deepStrictEqual(converted, expected);
})();

// disableCheckboxes: nothing to convert
(() => {
  // Arrange
  const text = `
  - Item 1
  - Item 2
  - Item 3
  `;

  // Act
  const converted = disableCheckboxes(text);

  // Assert
  const expected = `
  - Item 1
  - Item 2
  - Item 3
  `;

  assert.deepStrictEqual(converted, expected);
})();

// disableCheckboxes: empty string returns empty string
(() => {
  // Arrange
  const text = ``;

  // Act
  const converted = disableCheckboxes(text);

  // Assert
  const expected = ``;

  assert.deepStrictEqual(converted, expected);
})();

// disableCheckboxes: non-string input returns input
(() => {
  // Arrange
  const input = null;

  // Act
  const converted = disableCheckboxes(input);

  // Assert
  assert.deepStrictEqual(converted, input);
})();

// resetCheckboxes: basic reset
(() => {
  // Arrange
  const text = `
  - [ ] Item 1
  - [x] Item 2
  - [ ] Item 3
  `;

  // Act
  const converted = resetCheckboxes(text);

  // Assert
  const expected = `
  - [ ] Item 1
  - [ ] Item 2
  - [ ] Item 3
  `;

  assert.deepStrictEqual(converted, expected);
})();

// resetCheckboxes: nothing to change
(() => {
  // Arrange
  const text = `
  - Item 1
  - Item 2
  - Item 3
  `;

  // Act
  const converted = resetCheckboxes(text);

  // Assert
  const expected = `
  - Item 1
  - Item 2
  - Item 3
  `;

  assert.deepStrictEqual(converted, expected);
})();

// resetCheckboxes: empty string returns empty string
(() => {
  // Arrange
  const text = ``;

  // Act
  const converted = resetCheckboxes(text);

  // Assert
  const expected = ``;

  assert.deepStrictEqual(converted, expected);
})();

// resetCheckboxes: non-string input returns input
(() => {
  // Arrange
  const input = null;

  // Act
  const converted = resetCheckboxes(input);

  // Assert
  assert.deepStrictEqual(converted, input);
})();

// removeAlerts: basic multi-line alert removal
(() => {
  // Arrange
  const text = `
  Some intro
  > [!Caution]
  > ❌ This is a bad idea.
  After alert
  `;

  // Act
  const output = removeAlerts(text);

  // Assert - alert text removed
  assert.ok(!output.includes("> [!Caution]"));
  assert.ok(!output.includes("> ❌ This is a bad idea."));

  // Assert - surrounding text preserved
  assert.ok(output.includes("Some intro"));
  assert.ok(output.includes("After alert"));
})();

// removeAlerts: content on first line of alert
(() => {
  // Arrange
  const text = `
  Before
  > [!note] Some extra content
  > The rest of the alert.
  After
  `;

  // Act
  const output = removeAlerts(text);

  // Assert - alert text removed
  assert.ok(!output.includes("> [!note] Some extra content"));
  assert.ok(!output.includes("> The rest"));

  // Assert - surrounding text preserved
  assert.ok(output.includes("Before"));
  assert.ok(output.includes("After"));
})();

// removeAlerts: different case types and no leading space
(() => {
  // Arrange
  const text = `
  Before
  >[!TIP]
  > 🧐 You should try this.
  Middle
  > [!warning]
  > If you do this, that will happen.
  After
  `;

  // Act
  const output = removeAlerts(text);

  // Assert - alert text removed
  assert.ok(!output.includes("[!TIP]"));
  assert.ok(!output.includes("[!warning]"));

  // Assert - surrounding text preserved
  assert.ok(output.includes("Before"));
  assert.ok(output.includes("Middle"));
  assert.ok(output.includes("After"));
})();

// removeAlerts: non-string input returns input
(() => {
  // Arrange
  const input = null;

  // Act
  const output = removeAlerts(input);

  // Assert
  assert.deepStrictEqual(output, input);
})();

// rewriteRepoLocalImageUrls: rewrites local HTML image sources
(() => {
  // Arrange
  const text = '<img alt="hero" src="../images/start-mol.png" />';

  // Act
  const output = rewriteRepoLocalImageUrls(text, "https://github.com/octo/repo/raw/main/.github/images");

  // Assert
  assert.deepStrictEqual(
    output,
    '<img alt="hero" src="https://github.com/octo/repo/raw/main/.github/images/start-mol.png" />'
  );
})();

// rewriteRepoLocalImageUrls: rewrites local markdown image links
(() => {
  // Arrange
  const text = '![Hero](../images/start-mol.png)';

  // Act
  const output = rewriteRepoLocalImageUrls(text, "https://github.com/octo/repo/raw/main/.github/images");

  // Assert
  assert.deepStrictEqual(
    output,
    '![Hero](https://github.com/octo/repo/raw/main/.github/images/start-mol.png)'
  );
})();

// rewriteRepoLocalImageUrls: leaves placeholders and external URLs untouched
(() => {
  // Arrange
  const text = `
  <img alt="hero" src="{{ repo_image_base_url }}/start-mol.png" />
  <img alt="external" src="https://example.com/start-mol.png" />
  `;

  // Act
  const output = rewriteRepoLocalImageUrls(text, "https://github.com/octo/repo/raw/main/.github/images");

  // Assert
  assert.ok(output.includes('src="{{ repo_image_base_url }}/start-mol.png"'));
  assert.ok(output.includes('src="https://example.com/start-mol.png"'));
})();

// rewriteRepoLocalImageUrls: leaves already-absolute repo image URLs untouched
(() => {
  // Arrange
  const text = `
  <img alt="hero" src="https://github.com/octo/repo/raw/main/.github/images/start-mol.png" />
  ![Hero](https://github.com/octo/repo/raw/main/.github/images/start-mol.png)
  `;

  // Act
  const output = rewriteRepoLocalImageUrls(text, "https://github.com/octo/repo/raw/main/.github/images");

  // Assert
  assert.deepStrictEqual(output, text);
})();
// rewriteRepoLocalImageUrls: empty base URL leaves text unchanged
(() => {
  // Arrange
  const text = '<img alt="hero" src="../images/start-mol.png" />';

  // Act
  const output = rewriteRepoLocalImageUrls(text, "");

  // Assert
  assert.deepStrictEqual(output, text);
})();

// rewriteRepoLocalImageUrls: rewrites single-quoted HTML image sources
(() => {
  // Arrange
  const text = "<img alt='hero' src='./../images/start-mol.png' />";

  // Act
  const output = rewriteRepoLocalImageUrls(text, "https://github.com/octo/repo/raw/main/.github/images");

  // Assert
  assert.deepStrictEqual(
    output,
    "<img alt='hero' src='https://github.com/octo/repo/raw/main/.github/images/start-mol.png' />"
  );
})();

// rewriteRepoLocalImageUrls: leaves plain text local paths unchanged
(() => {
  // Arrange
  const text = "Use ../images/start-mol.png as a written example.";

  // Act
  const output = rewriteRepoLocalImageUrls(text, "https://github.com/octo/repo/raw/main/.github/images");

  // Assert
  assert.deepStrictEqual(output, text);
})();

// rewriteRepoLocalImageUrls: still supports root-style repo image paths
(() => {
  // Arrange
  const text = '<img alt="hero" src=".github/images/start-mol.png" />';

  // Act
  const output = rewriteRepoLocalImageUrls(text, "https://github.com/octo/repo/raw/main/.github/images");

  // Assert
  assert.deepStrictEqual(
    output,
    '<img alt="hero" src="https://github.com/octo/repo/raw/main/.github/images/start-mol.png" />'
  );
})();

// If nothing threw an exception, all tests passed
console.log("All tests passed");
