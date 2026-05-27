const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { rewriteRepoLocalImageUrls } = require("./actions-utils");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REPO_IMAGE_BASE_URL = "https://github.com/octo-org/quest-repo/raw/main/.github/images";

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function getImageAttributePaths(text) {
  return [
    ...text.matchAll(/<img\b[^>]*?\bsrc\s*=\s*(["'])([^"']+)\1/gi),
    ...text.matchAll(/!\[[^\]]*]\(([^)]+)\)/g),
  ].map((match) => match[2] || match[1]);
}

function isRepoLocalImagePath(value) {
  return (
    typeof value === "string" &&
    (value.startsWith("../images/") ||
      value.startsWith("./../images/") ||
      value.startsWith(".github/images/") ||
      value.startsWith("./.github/images/"))
  );
}

function assertNoRepoLocalImagesInCode(relativePath) {
  const text = readRepoFile(relativePath);
  const inlineCodeMatches = [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  const fencedCodeMatches = [...text.matchAll(/```[\s\S]*?```/g)].map((match) => match[0]);
  const codeSegments = [...inlineCodeMatches, ...fencedCodeMatches];

  for (const segment of codeSegments) {
    assert.ok(
      !segment.includes("../images/") &&
        !segment.includes("./../images/") &&
        !segment.includes(".github/images/") &&
        !segment.includes("./.github/images/"),
      `${relativePath} contains repo-local image syntax inside code content, which the renderer would rewrite unexpectedly`
    );
  }
}

function assertRenderedImagesNormalize(relativePath) {
  const source = readRepoFile(relativePath);
  const rendered = rewriteRepoLocalImageUrls(source, REPO_IMAGE_BASE_URL);
  const sourcePaths = getImageAttributePaths(source);
  const renderedPaths = getImageAttributePaths(rendered);
  const repoLocalSourcePaths = sourcePaths.filter(isRepoLocalImagePath);

  for (const renderedPath of renderedPaths) {
    assert.ok(
      !isRepoLocalImagePath(renderedPath),
      `${relativePath} still contains repo-local image path after rendering: ${renderedPath}`
    );
  }

  for (const sourcePath of repoLocalSourcePaths) {
    const normalizedPath = sourcePath.replace(
      /^(?:(?:\.\/)?\.github\/images|(?:\.\/)?\.\.\/images)\//,
      `${REPO_IMAGE_BASE_URL}/`
    );
    assert.ok(
      rendered.includes(normalizedPath),
      `${relativePath} did not rewrite ${sourcePath} to ${normalizedPath}`
    );
  }
}

function assertWorkflowUsesRenderer(relativePath, expectations) {
  const workflow = readRepoFile(relativePath);

  for (const expectation of expectations) {
    assert.ok(
      workflow.includes(`id: ${expectation.buildStepId}`),
      `${relativePath} is missing build step ${expectation.buildStepId}`
    );
    assert.ok(
      workflow.includes("uses: ./.github/actions/render-markdown-template"),
      `${relativePath} does not use the shared markdown renderer`
    );
    assert.ok(
      workflow.includes(`template-file: ${expectation.templateFile}`),
      `${relativePath} is missing template-file ${expectation.templateFile}`
    );
    assert.ok(
      workflow.includes(expectation.bodyReference),
      `${relativePath} is missing rendered body reference ${expectation.bodyReference}`
    );

    if (expectation.extraIncludes) {
      for (const value of expectation.extraIncludes) {
        assert.ok(
          workflow.includes(value),
          `${relativePath} is missing expected workflow content: ${value}`
        );
      }
    }
  }
}

function assertInOrder(text, fragments, messagePrefix) {
  let lastIndex = -1;

  for (const fragment of fragments) {
    const currentIndex = text.indexOf(fragment, lastIndex + 1);
    assert.ok(currentIndex !== -1, `${messagePrefix} is missing fragment: ${fragment}`);
    assert.ok(currentIndex > lastIndex, `${messagePrefix} has fragments out of order near: ${fragment}`);
    lastIndex = currentIndex;
  }
}

function assertQuestCompletionFlow(relativePath, disableStepName) {
  const workflow = readRepoFile(relativePath);

  assertInOrder(
    workflow,
    [
      "name: Build comment - show tip",
      "name: Add comment - show tip",
      "name: Build comment - finalize quest",
      "name: Add comment - finalize quest",
      "name: Close the issue",
      `name: ${disableStepName}`,
      "handoff_to_start:",
      "needs: finish_challenge",
      "if: ${{ needs.finish_challenge.result == 'success' }}",
      "uses: ./.github/workflows/0-0-start.yml",
      "closed-issue-number: ${{ github.event.issue.number }}",
    ],
    `${relativePath} quest completion flow`
  );
}

const stepMarkdownFiles = fs
  .readdirSync(path.join(REPO_ROOT, ".github", "steps"))
  .filter((fileName) => fileName.endsWith(".md"))
  .map((fileName) => `.github/steps/${fileName}`)
  .sort();

for (const templateFile of stepMarkdownFiles) {
  assertNoRepoLocalImagesInCode(templateFile);
  assertRenderedImagesNormalize(templateFile);
}

assertWorkflowUsesRenderer(".github/workflows/0-0-start.yml", [
  {
    buildStepId: "build-issue-description",
    templateFile: ".github/steps/0-0-start.md",
    bodyReference: "ISSUE_BODY: ${{ steps.build-issue-description.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-close-comment",
    templateFile: ".github/steps/x-close-with-next-link.md",
    bodyReference: "COMMENT_BODY: ${{ steps.build-close-comment.outputs.rendered-text }}",
  },
]);

const closeWithNextLinkTemplate = readRepoFile(".github/steps/x-close-with-next-link.md");
assert.ok(
  closeWithNextLinkTemplate.includes("{{ next_issue_url }}"),
  "The close-with-next-link template must include the next issue URL placeholder"
);

const startWorkflow = readRepoFile(".github/workflows/0-0-start.yml");
assertInOrder(
  startWorkflow,
  [
    "name: Set closed issue number",
    "id: set-closed-issue-number",
    "name: Build close comment",
    "template-file: .github/steps/x-close-with-next-link.md",
    "next_issue_url: ${{ steps.set-next-issue-url.outputs.issue_url }}",
    "name: Add comment - close with next issue link",
    "issue_number: Number(process.env.CLOSED_ISSUE_NUMBER)",
    "body: process.env.COMMENT_BODY",
  ],
  ".github/workflows/0-0-start.yml closed-issue comment flow"
);

assertWorkflowUsesRenderer(".github/workflows/1-1-mona-start.yml", [
  {
    buildStepId: "build-challenge-intro",
    templateFile: ".github/steps/1-1-mona-intro.md",
    bodyReference: "body: ${{ steps.build-challenge-intro.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-task",
    templateFile: ".github/steps/1-2-mona-talk.md",
    bodyReference: "body: ${{ steps.build-task.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-graph",
    templateFile: ".github/steps/1-3-mona-graph.md",
    bodyReference: "body: ${{ steps.build-graph.outputs.rendered-text }}",
  },
]);

assertWorkflowUsesRenderer(".github/workflows/1-2-mona-check.yml", [
  {
    buildStepId: "build-step-results",
    templateFile: ".github/steps/1-4-mona-talk.md",
    bodyReference: "body: ${{ steps.build-step-results.outputs.rendered-text }}",
    extraIncludes: ["not_asc_count: ${{ steps.check-dates-order.outputs.not-asc-count }}"],
  },
  {
    buildStepId: "build-tip",
    templateFile: ".github/steps/1-6-mona-tip.md",
    bodyReference: "body: ${{ steps.build-tip.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-finish",
    templateFile: ".github/steps/1-5-mona-finish.md",
    bodyReference: "body: ${{ steps.build-finish.outputs.rendered-text }}",
  },
]);
assertQuestCompletionFlow(".github/workflows/1-2-mona-check.yml", "Disable current workflow");

assertWorkflowUsesRenderer(".github/workflows/2-1-copilot-start.yml", [
  {
    buildStepId: "build-challenge-intro",
    templateFile: ".github/steps/2-1-copilot-intro.md",
    bodyReference: "body: ${{ steps.build-challenge-intro.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-task",
    templateFile: ".github/steps/2-2-copilot-talk.md",
    bodyReference: "body: ${{ steps.build-task.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-diagram",
    templateFile: ".github/steps/2-3-copilot-diagram.md",
    bodyReference: "body: ${{ steps.build-diagram.outputs.rendered-text }}",
  },
]);

assertWorkflowUsesRenderer(".github/workflows/2-2-copilot-check.yml", [
  {
    buildStepId: "build-tip",
    templateFile: ".github/steps/2-6-copilot-tip.md",
    bodyReference: "body: ${{ steps.build-tip.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-finish",
    templateFile: ".github/steps/2-5-copilot-finish.md",
    bodyReference: "body: ${{ steps.build-finish.outputs.rendered-text }}",
  },
]);
assertQuestCompletionFlow(".github/workflows/2-2-copilot-check.yml", "Disable current workflow");

// Copilot check workflow must use the mermaid validator and look for the diagram comment
const copilotCheckWorkflow = readRepoFile(".github/workflows/2-2-copilot-check.yml");
assert.ok(
  copilotCheckWorkflow.includes("check-copilot-mermaid"),
  "2-2-copilot-check.yml must require the check-copilot-mermaid module"
);
assert.ok(
  copilotCheckWorkflow.includes("Restore the SDLC Flow"),
  "2-2-copilot-check.yml must search for the diagram comment by its header"
);
assert.ok(
  copilotCheckWorkflow.includes("checkSdlcDiagram"),
  "2-2-copilot-check.yml must call checkSdlcDiagram"
);

assertWorkflowUsesRenderer(".github/workflows/3-1-ducky-start.yml", [
  {
    buildStepId: "build-intro",
    templateFile: ".github/steps/3-1-ducky-intro.md",
    bodyReference: "body: ${{ steps.build-intro.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-task",
    templateFile: ".github/steps/3-2-ducky-talk.md",
    bodyReference: "body: ${{ steps.build-task.outputs.rendered-text }}",
    extraIncludes: ["repo_image_base_url: ${{ env.REPO_IMAGE_BASE_URL }}"],
  },
]);

assertWorkflowUsesRenderer(".github/workflows/3-2-ducky-check.yml", [
  {
    buildStepId: "build-tip",
    templateFile: ".github/steps/3-6-ducky-tip.md",
    bodyReference: "body: ${{ steps.build-tip.outputs.rendered-text }}",
  },
  {
    buildStepId: "build-finish",
    templateFile: ".github/steps/3-5-ducky-finish.md",
    bodyReference: "body: ${{ steps.build-finish.outputs.rendered-text }}",
  },
]);
assertQuestCompletionFlow(".github/workflows/3-2-ducky-check.yml", "Disable current workflow");

// Ensure the pull request harness runs the quest workflow checks.
const prWorkflow = readRepoFile(".github/workflows/quest-workflow-harness.yml");
assert.ok(prWorkflow.includes("pull_request:"), "PR workflow harness must run on pull_request");
assert.ok(
  prWorkflow.includes("node .github/workflows/quest-workflow-harness.test.js"),
  "PR workflow harness must run the workflow harness test"
);

// 0-bootstrap-readme.yml contract: renders start-game template and
// publishes README.md only on initial template clone (push event on a
// non-template repository). Lives in its own workflow file (not as a
// job in 0-0-start.yml) so the `contents: write` permission does not
// have to be delegated by every caller of the reusable 0-0-start
// workflow — that mismatch caused startup_failure on cloned repos when
// check workflows (which only have `contents: read`) invoked
// 0-0-start via workflow_call.
const readmeTemplatePath = ".github/markdown-templates/readme/start-game.md";
const readmeTemplate = readRepoFile(readmeTemplatePath);
assert.ok(
  readmeTemplate.includes("{{ game_title }}"),
  "start-game template must include {{ game_title }} placeholder"
);
assert.ok(
  readmeTemplate.includes("{{ issues_url }}"),
  "start-game template must include {{ issues_url }} placeholder"
);
assert.ok(
  readmeTemplate.includes("{{ login }}"),
  "start-game template must include {{ login }} placeholder"
);
assertRenderedImagesNormalize(readmeTemplatePath);

const bootstrapWorkflowPath = ".github/workflows/0-bootstrap-readme.yml";
const bootstrapWorkflow = readRepoFile(bootstrapWorkflowPath);

// Bootstrap workflow must NOT be triggerable via workflow_call / issues /
// issue_comment / workflow_dispatch — only direct push to main — so the
// normal quest flow never rewrites the README and reusable-workflow
// callers don't need to grant `contents: write`.
assert.ok(
  /\bon:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]\s*\n\s*permissions:/m.test(
    bootstrapWorkflow
  ),
  "0-bootstrap-readme.yml must trigger ONLY on push to main (no workflow_call/issues/issue_comment/workflow_dispatch)"
);

// 0-0-start.yml must NOT contain the README bootstrap job — it lives in
// its own workflow now to avoid permission escalation through workflow_call.
assert.ok(
  !startWorkflow.includes("update_readme:"),
  "0-0-start.yml must not contain update_readme job (moved to 0-bootstrap-readme.yml)"
);

assert.ok(
  /^permissions:\s*\n\s*contents:\s*write\b/m.test(bootstrapWorkflow),
  "0-bootstrap-readme.yml must declare workflow-level `permissions: contents: write`"
);

assertInOrder(
  bootstrapWorkflow,
  [
    "update_readme:",
    "if: ${{ github.repository != 'ghlearn/merge-of-legends' }}",
    "uses: actions/checkout@v5",
    "id: render-readme",
    "uses: ./.github/actions/render-markdown-template",
    "template-file: .github/markdown-templates/readme/start-game.md",
    "game_title: ${{ env.EXERCISE_TITLE }}",
    "issues_url: ${{ github.server_url }}/${{ github.repository }}/issues",
    "login: ${{ github.repository_owner }}",
    "name: Publish README if changed",
    "RENDERED_README: ${{ steps.render-readme.outputs.rendered-text }}",
    "const path = 'README.md'",
    "github.rest.repos.getContent",
    "TEMPLATE_MARKER = 'template_owner=ghlearn&template_name=merge-of-legends'",
    "github.rest.repos.createOrUpdateFileContents",
    "docs: bootstrap README from start-game template",
  ],
  ".github/workflows/0-bootstrap-readme.yml update_readme job"
);

console.log("All tests passed");
