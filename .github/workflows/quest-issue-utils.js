const VALID_CHARACTERS = ["mona", "copilot", "ducky"];

/**
 * Determine the next quest character from a closed issue's body and comments.
 *
 * Resolution order:
 *  1. Last `/char <name>` command in comments by a non-bot user.
 *  2. Embedded `<!-- quest-character: <name> -->` tag in the issue body.
 *  3. Default: copilot (first run or untagged issue with no /char command).
 *
 * @param {string|null} closedIssueBody - Body of the closed issue, or null.
 * @param {Array<{body: string, user: {login: string}}>} closedIssueComments - Comments on the closed issue.
 * @returns {string} One of "mona", "copilot", or "ducky".
 */
function resolveNextCharacter(closedIssueBody, closedIssueComments) {
  const charPattern = /\/char\s+(mona|copilot|ducky)\b/gi;

  // Walk comments oldest→newest, collecting all matches so "last one wins"
  let lastCommandCharacter = null;
  for (const comment of closedIssueComments || []) {
    if (comment.user?.login?.endsWith("[bot]")) continue;
    const body = comment.body || "";
    let match;
    while ((match = charPattern.exec(body)) !== null) {
      lastCommandCharacter = match[1].toLowerCase();
    }
    charPattern.lastIndex = 0; // reset for next comment body
  }
  if (lastCommandCharacter) return lastCommandCharacter;

  // Fall back to the embedded tag in the issue body
  const bodyMatch = (closedIssueBody || "").match(
    /<!--\s*quest-character:\s*(mona|copilot|ducky)\s*-->/i
  );
  if (bodyMatch) return bodyMatch[1].toLowerCase();

  // Default: copilot (first run or untagged issue with no /char command)
  return "copilot";
}

function getOpenQuestIssues(issues, titlePrefix = "Quest: ") {
  if (!Array.isArray(issues) || issues.length === 0) return [];

  return issues
    .filter((issue) => issue && !issue.pull_request && issue.title?.startsWith(titlePrefix))
    .sort((a, b) => a.number - b.number);
}

function planQuestIssueReset(issues, titlePrefix = "Quest: ") {
  const openQuestIssues = getOpenQuestIssues(issues, titlePrefix);

  if (openQuestIssues.length === 0) {
    return {
      shouldCreate: true,
      issueNumber: "",
      issueUrl: "",
      duplicateIssueNumbers: [],
    };
  }

  const [primaryIssue, ...duplicateIssues] = openQuestIssues;

  return {
    shouldCreate: false,
    issueNumber: String(primaryIssue.number),
    issueUrl: primaryIssue.html_url || "",
    duplicateIssueNumbers: duplicateIssues.map((issue) => String(issue.number)),
  };
}

module.exports = {
  getOpenQuestIssues,
  planQuestIssueReset,
  resolveNextCharacter,
  VALID_CHARACTERS,
};
