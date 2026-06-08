const REQUIRED_IMAGES = {
  ducky: ".github/images/ducky-intro.png",
  mona: ".github/images/mona-intro.png",
  copilot: ".github/images/copilot-intro.png",
};

function getRepositoryParts() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (typeof repository !== "string") return null;

  const parts = repository.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  return { owner: parts[0], repo: parts[1] };
}

function getServerHostname() {
  const serverUrl = process.env.GITHUB_SERVER_URL;
  if (typeof serverUrl !== "string") return null;

  try {
    return new URL(serverUrl).hostname;
  } catch {
    return null;
  }
}

function getRequiredImageFromPathname(pathname, prefixLength) {
  const requiredPath = Object.values(REQUIRED_IMAGES).find((path) => pathname.endsWith(`/${path}`));
  if (!requiredPath) return null;

  const refAndPath = pathname.slice(prefixLength);
  const imageStart = refAndPath.lastIndexOf(`/${requiredPath}`);
  if (imageStart === -1) return null;

  const ref = refAndPath.slice(0, imageStart).replace(/^\/+|\/+$/g, "");
  if (!ref) return null;

  return requiredPath;
}

function matchRepositoryImageUrl(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "https:") return null;

  const repository = getRepositoryParts();
  const serverHostname = getServerHostname();
  if (!repository || !serverHostname) return null;

  const pathname = parsedUrl.pathname;
  const rawPrefix = `/${repository.owner}/${repository.repo}/`;
  if (
    serverHostname === "github.com" &&
    parsedUrl.hostname === "raw.githubusercontent.com" &&
    pathname.startsWith(rawPrefix)
  ) {
    return getRequiredImageFromPathname(pathname, rawPrefix.length);
  }

  const githubPrefix = `/${repository.owner}/${repository.repo}/`;
  if (parsedUrl.hostname === serverHostname && pathname.startsWith(githubPrefix)) {
    const rest = pathname.slice(githubPrefix.length);

    if (rest.startsWith("raw/") || rest.startsWith("blob/")) {
      const modePrefixLength = rest.startsWith("raw/") ? 4 : 5;
      return getRequiredImageFromPathname(rest, modePrefixLength);
    }
  }

  return null;
}

function matchRequiredImage(url) {
  if (typeof url !== "string") return null;

  if (Object.values(REQUIRED_IMAGES).includes(url)) return url;

  return matchRepositoryImageUrl(url);
}

/**
 * Parse values from the challenge section.
 *
 * @param {string} text
 * @returns {string[]} array of card values in order
 */
function parseUncoveredCards(text) {
  if (typeof text !== "string" || text.length === 0) return [];

  const sectionMatch = text.match(/^\s*###\s*(?:Character|Image)\s*Slots\s*$/im);
  if (!sectionMatch) return [];

  const section = text.slice(sectionMatch.index + sectionMatch[0].length);
  const lines = section.split(/\r?\n/);
  const cards = [];
  let started = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^<\/?p\b[^>]*>$/i.test(trimmed)) continue;

    const bulletMatch = trimmed.match(/^-+\s*(.+)$/);
    if (bulletMatch) {
      const value = bulletMatch[1].trim().replace(/^Character\s*\d+\s*:\s*/i, "").trim();
      cards.push(value);
      started = true;
      if (cards.length === 3) break;
      continue;
    }

    if (started) break;
  }

  return cards;
}

function extractImageAttributes(cardValue) {
  if (typeof cardValue !== "string") return null;

  const value = cardValue.trim();
  const imgTagMatch = value.match(/^<img\b([^>]*)\/?>$/i);
  if (!imgTagMatch) return null;

  const attributes = {};
  const attrRe = /\b([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = attrRe.exec(imgTagMatch[1])) !== null) {
    attributes[match[1].toLowerCase()] = match[2];
  }

  if (!attributes.src || !attributes.alt || !attributes.width) return null;
  return attributes;
}

/**
 * Check if all 3 character images are added with the required alt text and width.
 *
 * @param {string[]} cards
 * @returns {boolean}
 */
function checkDuckyMatches(cards) {
  if (!Array.isArray(cards) || cards.length !== 3) return false;

  const remaining = new Set(Object.keys(REQUIRED_IMAGES));

  for (const card of cards) {
    const attributes = extractImageAttributes(card);
    if (!attributes) return false;
    if (attributes.width !== "20%") return false;

    const alt = attributes.alt.trim().toLowerCase();
    if (!remaining.has(alt)) return false;

    const matchedImage = matchRequiredImage(attributes.src);
    if (!matchedImage || matchedImage !== REQUIRED_IMAGES[alt]) return false;

    remaining.delete(alt);
  }

  return remaining.size === 0;
}

module.exports = { REQUIRED_IMAGES, parseUncoveredCards, checkDuckyMatches };
