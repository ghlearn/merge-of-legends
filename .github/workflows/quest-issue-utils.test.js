const assert = require("assert");
const { getOpenQuestIssues, planQuestIssueReset, resolveNextCharacter, VALID_CHARACTERS } = require("./quest-issue-utils");

// getOpenQuestIssues: empty or invalid input returns empty array
(() => {
  assert.deepStrictEqual(getOpenQuestIssues(null), []);
  assert.deepStrictEqual(getOpenQuestIssues(undefined), []);
  assert.deepStrictEqual(getOpenQuestIssues([]), []);
})();

// getOpenQuestIssues: only keeps quest issues and sorts by number
(() => {
  const issues = [
    { number: 10, title: "Quest: Copilot", html_url: "https://example.com/10" },
    { number: 3, title: "Bug report", html_url: "https://example.com/3" },
    { number: 7, title: "Quest: Ducky", html_url: "https://example.com/7" },
    { number: 2, title: "Quest: PR mirror", pull_request: {}, html_url: "https://example.com/2" },
  ];

  assert.deepStrictEqual(
    getOpenQuestIssues(issues).map((issue) => issue.number),
    [7, 10]
  );
})();

// planQuestIssueReset: no open quest issues means a new issue should be created
(() => {
  assert.deepStrictEqual(planQuestIssueReset([{ number: 1, title: "Bug report" }]), {
    shouldCreate: true,
    issueNumber: "",
    issueUrl: "",
    duplicateIssueNumbers: [],
  });
})();

// planQuestIssueReset: chooses the oldest quest issue and marks extras for closure
(() => {
  const issues = [
    { number: 12, title: "Quest: Copilot", html_url: "https://example.com/12" },
    { number: 5, title: "Quest: Mona", html_url: "https://example.com/5" },
    { number: 9, title: "Quest: Ducky", html_url: "https://example.com/9" },
  ];

  assert.deepStrictEqual(planQuestIssueReset(issues), {
    shouldCreate: false,
    issueNumber: "5",
    issueUrl: "https://example.com/5",
    duplicateIssueNumbers: ["9", "12"],
  });
})();

// resolveNextCharacter: returns "copilot" as default when no context is provided
(() => {
  assert.strictEqual(resolveNextCharacter(null, []), "copilot");
  assert.strictEqual(resolveNextCharacter("", []), "copilot");
  assert.strictEqual(resolveNextCharacter(null, null), "copilot");
})();

// resolveNextCharacter: reads embedded tag from issue body when no /char command is present
(() => {
  const body = "Some text\n<!-- quest-character: copilot -->\nMore text";
  assert.strictEqual(resolveNextCharacter(body, []), "copilot");
})();

// resolveNextCharacter: reads /char command from a comment, overriding body tag
(() => {
  const body = "<!-- quest-character: mona -->";
  const comments = [{ body: "/char ducky", user: { login: "player" } }];
  assert.strictEqual(resolveNextCharacter(body, comments), "ducky");
})();

// resolveNextCharacter: last /char command wins across multiple comments
(() => {
  const comments = [
    { body: "/char mona", user: { login: "player" } },
    { body: "working on it", user: { login: "player" } },
    { body: "/char copilot", user: { login: "player" } },
  ];
  assert.strictEqual(resolveNextCharacter(null, comments), "copilot");
})();

// resolveNextCharacter: last /char command wins within a single comment
(() => {
  const comments = [
    { body: "I want /char mona but actually /char ducky", user: { login: "player" } },
  ];
  assert.strictEqual(resolveNextCharacter(null, comments), "ducky");
})();

// resolveNextCharacter: /char commands from bots are ignored
(() => {
  const body = "<!-- quest-character: mona -->";
  const comments = [
    { body: "/char copilot", user: { login: "github-actions[bot]" } },
    { body: "/char ducky", user: { login: "some-bot[bot]" } },
  ];
  assert.strictEqual(resolveNextCharacter(body, comments), "mona");
})();

// resolveNextCharacter: command matching is case-insensitive
(() => {
  const comments = [{ body: "/char COPILOT", user: { login: "player" } }];
  assert.strictEqual(resolveNextCharacter(null, comments), "copilot");
})();

// resolveNextCharacter: requires word boundary (no partial matches like /char monasmith)
(() => {
  const comments = [{ body: "/char monasmith", user: { login: "player" } }];
  // No valid match; falls back to body tag
  const body = "<!-- quest-character: ducky -->";
  assert.strictEqual(resolveNextCharacter(body, comments), "ducky");
})();

// resolveNextCharacter: null comments array is tolerated
(() => {
  const body = "<!-- quest-character: mona -->";
  assert.strictEqual(resolveNextCharacter(body, null), "mona");
})();

console.log("All tests passed");
