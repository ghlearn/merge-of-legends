const SDLC_PHASES = [
  "Planning",
  "Requirements",
  "Design",
  "Implementation",
  "Testing",
  "Deployment",
  "Maintenance",
];

const EXPECTED_CONNECTIONS = [
  ["Planning", "Requirements"],
  ["Requirements", "Design"],
  ["Design", "Implementation"],
  ["Implementation", "Testing"],
  ["Testing", "Deployment"],
  ["Deployment", "Maintenance"],
];

/**
 * Extract the content of the first mermaid code block from the given text.
 *
 * @param {string} text
 * @returns {string|null} trimmed mermaid block content, or null if not found
 */
function extractMermaidBlock(text) {
  if (typeof text !== "string" || text.length === 0) return null;

  const match = text.match(/```mermaid\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}

/**
 * Parse all A --> B connections from a mermaid diagram text.
 *
 * @param {string} mermaidText
 * @returns {Array<[string, string]>} array of [from, to] pairs
 */
function parseConnections(mermaidText) {
  if (typeof mermaidText !== "string" || mermaidText.length === 0) return [];

  const connections = [];
  const re = /([A-Za-z][A-Za-z0-9_]*)\s*-->\s*([A-Za-z][A-Za-z0-9_]*)/g;
  let match;

  while ((match = re.exec(mermaidText)) !== null) {
    connections.push([match[1], match[2]]);
  }

  return connections;
}

/**
 * Find the SDLC connections that are absent from the given parsed connections list.
 *
 * @param {Array<[string, string]>} connections
 * @returns {Array<[string, string]>} missing connections
 */
function findMissingConnections(connections) {
  return EXPECTED_CONNECTIONS.filter(
    ([from, to]) =>
      !connections.some(
        ([f, t]) =>
          f.toLowerCase() === from.toLowerCase() &&
          t.toLowerCase() === to.toLowerCase()
      )
  );
}

/**
 * Check if the SDLC flowchart diagram in the given comment text is correct.
 * The text must contain a mermaid code block with all required SDLC connections.
 *
 * @param {string} text
 * @returns {boolean} true if all required SDLC connections are present
 */
function checkSdlcDiagram(text) {
  const mermaidBlock = extractMermaidBlock(text);
  if (!mermaidBlock) return false;

  const connections = parseConnections(mermaidBlock);
  if (connections.length === 0) return false;

  return findMissingConnections(connections).length === 0;
}

module.exports = {
  SDLC_PHASES,
  EXPECTED_CONNECTIONS,
  extractMermaidBlock,
  parseConnections,
  findMissingConnections,
  checkSdlcDiagram,
};
