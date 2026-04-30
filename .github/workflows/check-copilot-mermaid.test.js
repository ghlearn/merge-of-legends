const assert = require("assert");
const {
  SDLC_PHASES,
  EXPECTED_CONNECTIONS,
  extractMermaidBlock,
  parseConnections,
  findMissingConnections,
  checkSdlcDiagram,
} = require("./check-copilot-mermaid");

// Manually run these tests in the CLI:
// node .github/workflows/check-copilot-mermaid.test.js

const CORRECT_MERMAID = `\`\`\`mermaid
flowchart LR
    Planning --> Requirements
    Requirements --> Design
    Design --> Implementation
    Implementation --> Testing
    Testing --> Deployment
    Deployment --> Maintenance
\`\`\``;

const SCRAMBLED_MERMAID = `\`\`\`mermaid
flowchart LR
    Planning --> Design
    Design --> Requirements
    Requirements --> Deployment
    Deployment --> Implementation
    Implementation --> Maintenance
    Maintenance --> Testing
\`\`\``;

// extractMermaidBlock: empty text returns null
(() => {
  assert.strictEqual(extractMermaidBlock(""), null);
})();

// extractMermaidBlock: no mermaid block returns null
(() => {
  assert.strictEqual(extractMermaidBlock("some text without a code block"), null);
})();

// extractMermaidBlock: non-string returns null
(() => {
  assert.strictEqual(extractMermaidBlock(null), null);
  assert.strictEqual(extractMermaidBlock(undefined), null);
})();

// extractMermaidBlock: extracts content of a mermaid block
(() => {
  const text = `Some text\n${CORRECT_MERMAID}\nMore text`;
  const block = extractMermaidBlock(text);
  assert.ok(block !== null, "Should find a block");
  assert.ok(block.includes("Planning --> Requirements"), "Should contain SDLC connection");
})();

// extractMermaidBlock: case-insensitive mermaid tag
(() => {
  const text = "```MERMAID\nflowchart LR\n    A --> B\n```";
  const block = extractMermaidBlock(text);
  assert.ok(block !== null, "Should extract block with uppercase MERMAID");
  assert.ok(block.includes("A --> B"));
})();

// parseConnections: empty text returns empty array
(() => {
  assert.deepStrictEqual(parseConnections(""), []);
})();

// parseConnections: non-string returns empty array
(() => {
  assert.deepStrictEqual(parseConnections(null), []);
  assert.deepStrictEqual(parseConnections(undefined), []);
})();

// parseConnections: simple two-node chain
(() => {
  const text = "flowchart LR\n    A --> B\n    B --> C";
  const conns = parseConnections(text);
  assert.deepStrictEqual(conns, [
    ["A", "B"],
    ["B", "C"],
  ]);
})();

// parseConnections: full correct SDLC diagram
(() => {
  const text =
    "flowchart LR\n" +
    "    Planning --> Requirements\n" +
    "    Requirements --> Design\n" +
    "    Design --> Implementation\n" +
    "    Implementation --> Testing\n" +
    "    Testing --> Deployment\n" +
    "    Deployment --> Maintenance";
  const conns = parseConnections(text);
  assert.strictEqual(conns.length, 6);
  assert.deepStrictEqual(conns[0], ["Planning", "Requirements"]);
  assert.deepStrictEqual(conns[5], ["Deployment", "Maintenance"]);
})();

// findMissingConnections: all correct returns empty array
(() => {
  const connections = [
    ["Planning", "Requirements"],
    ["Requirements", "Design"],
    ["Design", "Implementation"],
    ["Implementation", "Testing"],
    ["Testing", "Deployment"],
    ["Deployment", "Maintenance"],
  ];
  assert.deepStrictEqual(findMissingConnections(connections), []);
})();

// findMissingConnections: all wrong returns all expected connections as missing
(() => {
  const connections = [
    ["Planning", "Design"],
    ["Design", "Requirements"],
    ["Requirements", "Deployment"],
    ["Deployment", "Implementation"],
    ["Implementation", "Maintenance"],
    ["Maintenance", "Testing"],
  ];
  assert.strictEqual(findMissingConnections(connections).length, EXPECTED_CONNECTIONS.length);
})();

// findMissingConnections: case-insensitive matching treats lowercase as correct
(() => {
  const connections = [
    ["planning", "requirements"],
    ["requirements", "design"],
    ["design", "implementation"],
    ["implementation", "testing"],
    ["testing", "deployment"],
    ["deployment", "maintenance"],
  ];
  assert.deepStrictEqual(findMissingConnections(connections), []);
})();

// findMissingConnections: one missing connection is reported correctly
(() => {
  const connections = [
    ["Planning", "Requirements"],
    ["Requirements", "Design"],
    ["Design", "Implementation"],
    ["Implementation", "Testing"],
    // Missing: Testing --> Deployment
    ["Deployment", "Maintenance"],
  ];
  const missing = findMissingConnections(connections);
  assert.strictEqual(missing.length, 1);
  assert.deepStrictEqual(missing[0], ["Testing", "Deployment"]);
})();

// checkSdlcDiagram: empty text returns false
(() => {
  assert.strictEqual(checkSdlcDiagram(""), false);
})();

// checkSdlcDiagram: non-string input returns false
(() => {
  assert.strictEqual(checkSdlcDiagram(null), false);
  assert.strictEqual(checkSdlcDiagram(undefined), false);
})();

// checkSdlcDiagram: plain text with no mermaid block returns false
(() => {
  assert.strictEqual(checkSdlcDiagram("Planning --> Requirements"), false);
})();

// checkSdlcDiagram: scrambled diagram returns false
(() => {
  const text = `Some context\n${SCRAMBLED_MERMAID}\nMore text`;
  assert.strictEqual(checkSdlcDiagram(text), false);
})();

// checkSdlcDiagram: correct diagram returns true
(() => {
  const text = `Some context\n${CORRECT_MERMAID}\nMore text`;
  assert.strictEqual(checkSdlcDiagram(text), true);
})();

// checkSdlcDiagram: correct diagram with TD direction returns true
(() => {
  const text =
    "```mermaid\n" +
    "flowchart TD\n" +
    "    Planning --> Requirements\n" +
    "    Requirements --> Design\n" +
    "    Design --> Implementation\n" +
    "    Implementation --> Testing\n" +
    "    Testing --> Deployment\n" +
    "    Deployment --> Maintenance\n" +
    "```";
  assert.strictEqual(checkSdlcDiagram(text), true);
})();

// checkSdlcDiagram: correct diagram plus extra connections returns true
(() => {
  const text =
    "```mermaid\n" +
    "flowchart LR\n" +
    "    Planning --> Requirements\n" +
    "    Requirements --> Design\n" +
    "    Design --> Implementation\n" +
    "    Implementation --> Testing\n" +
    "    Testing --> Deployment\n" +
    "    Deployment --> Maintenance\n" +
    "    Maintenance --> Planning\n" +
    "```";
  assert.strictEqual(checkSdlcDiagram(text), true);
})();

// checkSdlcDiagram: missing one connection returns false
(() => {
  const text =
    "```mermaid\n" +
    "flowchart LR\n" +
    "    Planning --> Requirements\n" +
    "    Requirements --> Design\n" +
    "    Design --> Implementation\n" +
    "    Implementation --> Testing\n" +
    // Missing: Testing --> Deployment
    "    Deployment --> Maintenance\n" +
    "```";
  assert.strictEqual(checkSdlcDiagram(text), false);
})();

// checkSdlcDiagram: lowercase phase names return true (case-insensitive)
(() => {
  const text =
    "```mermaid\n" +
    "flowchart LR\n" +
    "    planning --> requirements\n" +
    "    requirements --> design\n" +
    "    design --> implementation\n" +
    "    implementation --> testing\n" +
    "    testing --> deployment\n" +
    "    deployment --> maintenance\n" +
    "```";
  assert.strictEqual(checkSdlcDiagram(text), true);
})();

// checkSdlcDiagram: diagram embedded in a full comment body with an alert returns true
(() => {
  const text =
    "## 🔀 Restore the SDLC Flow\n\n" +
    "Some instructions...\n\n" +
    CORRECT_MERMAID +
    "\n\n> [!Caution]\n> ❌ Some old alert";
  assert.strictEqual(checkSdlcDiagram(text), true);
})();

// SDLC_PHASES: exports the 7 expected phases in order
(() => {
  assert.deepStrictEqual(SDLC_PHASES, [
    "Planning",
    "Requirements",
    "Design",
    "Implementation",
    "Testing",
    "Deployment",
    "Maintenance",
  ]);
})();

// EXPECTED_CONNECTIONS: exports 6 connections (one less than phases)
(() => {
  assert.strictEqual(EXPECTED_CONNECTIONS.length, SDLC_PHASES.length - 1);
})();

// If nothing threw an exception, all tests passed
console.log("All tests passed");
