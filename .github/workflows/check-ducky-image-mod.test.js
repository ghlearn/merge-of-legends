const assert = require("assert");
const {
  REQUIRED_IMAGES,
  parseUncoveredCards,
  checkDuckyMatches,
} = require("./check-ducky-image-mod");

// Manually run these tests in the CLI:
// node .github/workflows/check-ducky-image-mod.test.js

const IMAGE_1 = REQUIRED_IMAGES.ducky;
const IMAGE_2 = REQUIRED_IMAGES.mona;
const IMAGE_3 = REQUIRED_IMAGES.copilot;
const ORIGINAL_GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const ORIGINAL_GITHUB_SERVER_URL = process.env.GITHUB_SERVER_URL;

function withGitHubContext({ repository, serverUrl }, callback) {
  process.env.GITHUB_REPOSITORY = repository;
  process.env.GITHUB_SERVER_URL = serverUrl;

  try {
    callback();
  } finally {
    process.env.GITHUB_REPOSITORY = ORIGINAL_GITHUB_REPOSITORY;
    process.env.GITHUB_SERVER_URL = ORIGINAL_GITHUB_SERVER_URL;
  }
}

// parseUncoveredCards: empty string returns empty array
(() => {
  assert.deepStrictEqual(parseUncoveredCards(""), []);
})();

// parseUncoveredCards: missing section returns empty array
(() => {
  assert.deepStrictEqual(parseUncoveredCards("some text without cards"), []);
})();

// parseUncoveredCards: extracts three character slots in order
(() => {
  const text = `
### Character Slots

- Character 1: ${IMAGE_1}
- Character 2: ${IMAGE_2}
- Character 3: ${IMAGE_3}
`;
  const cards = parseUncoveredCards(text);
  assert.deepStrictEqual(cards, [IMAGE_1, IMAGE_2, IMAGE_3]);
})();

// parseUncoveredCards: extracts three image slots in order (no Character labels)
(() => {
  const text = `
### Image Slots
<p align="left">
- ${IMAGE_1}
- ${IMAGE_2}
- ${IMAGE_3}
</p>
`;
  const cards = parseUncoveredCards(text);
  assert.deepStrictEqual(cards, [IMAGE_1, IMAGE_2, IMAGE_3]);
})();

// parseUncoveredCards: non-string input returns empty array
(() => {
  assert.deepStrictEqual(parseUncoveredCards(null), []);
  assert.deepStrictEqual(parseUncoveredCards(undefined), []);
})();

// checkDuckyMatches: exact HTML image tags with required width and alt text return true
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `<img width="20%" alt="ducky" src="${IMAGE_1}" />`,
      `<img width="20%" alt="mona" src="${IMAGE_2}" />`,
      `<img width="20%" alt="copilot" src="${IMAGE_3}" />`,
    ]),
    true
  );
})();

// checkDuckyMatches: accepts the three valid tags in any order
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `<img width="20%" alt="copilot" src="${IMAGE_3}" />`,
      `<img width="20%" alt="ducky" src="${IMAGE_1}" />`,
      `<img width="20%" alt="mona" src="${IMAGE_2}" />`,
    ]),
    true
  );
})();

// checkDuckyMatches: supports raw.githubusercontent.com URLs for the current repository
(() => {
  withGitHubContext(
    {
      repository: "octo-org/quest-repo",
      serverUrl: "https://github.com",
    },
    () => {
      assert.strictEqual(
        checkDuckyMatches([
          '<img width="20%" alt="ducky" src="https://raw.githubusercontent.com/octo-org/quest-repo/main/.github/images/ducky-intro.png" />',
          '<img width="20%" alt="mona" src="https://raw.githubusercontent.com/octo-org/quest-repo/main/.github/images/mona-intro.png" />',
          '<img width="20%" alt="copilot" src="https://raw.githubusercontent.com/octo-org/quest-repo/main/.github/images/copilot-intro.png" />',
        ]),
        true
      );
    }
  );
})();

// checkDuckyMatches: supports github.com raw/blob URLs with refs containing slashes
(() => {
  withGitHubContext(
    {
      repository: "octo-org/quest-repo",
      serverUrl: "https://github.com",
    },
    () => {
      assert.strictEqual(
        checkDuckyMatches([
          '<img width="20%" alt="ducky" src="https://github.com/octo-org/quest-repo/raw/release/v1/.github/images/ducky-intro.png" />',
          '<img width="20%" alt="mona" src="https://github.com/octo-org/quest-repo/blob/release/v1/.github/images/mona-intro.png" />',
          '<img width="20%" alt="copilot" src="https://github.com/octo-org/quest-repo/raw/release/v1/.github/images/copilot-intro.png" />',
        ]),
        true
      );
    }
  );
})();

// checkDuckyMatches: supports GHES raw URLs for the current repository
(() => {
  withGitHubContext(
    {
      repository: "octo-org/quest-repo",
      serverUrl: "https://git.example.com",
    },
    () => {
      assert.strictEqual(
        checkDuckyMatches([
          '<img width="20%" alt="ducky" src="https://git.example.com/octo-org/quest-repo/raw/trunk/.github/images/ducky-intro.png" />',
          '<img width="20%" alt="mona" src="https://git.example.com/octo-org/quest-repo/raw/trunk/.github/images/mona-intro.png" />',
          '<img width="20%" alt="copilot" src="https://git.example.com/octo-org/quest-repo/raw/trunk/.github/images/copilot-intro.png" />',
        ]),
        true
      );
    }
  );
})();

// checkDuckyMatches: rejects absolute URLs from a different host
(() => {
  withGitHubContext(
    {
      repository: "octo-org/quest-repo",
      serverUrl: "https://github.com",
    },
    () => {
      assert.strictEqual(
        checkDuckyMatches([
          '<img width="20%" alt="ducky" src="https://example.com/octo-org/quest-repo/raw/main/.github/images/ducky-intro.png" />',
          '<img width="20%" alt="mona" src="https://example.com/octo-org/quest-repo/raw/main/.github/images/mona-intro.png" />',
          '<img width="20%" alt="copilot" src="https://example.com/octo-org/quest-repo/raw/main/.github/images/copilot-intro.png" />',
        ]),
        false
      );
    }
  );
})();

// checkDuckyMatches: wrong number of entries returns false
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `<img width="20%" alt="ducky" src="${IMAGE_1}" />`,
      `<img width="20%" alt="mona" src="${IMAGE_2}" />`,
    ]),
    false
  );
})();

// checkDuckyMatches: duplicate alt text returns false
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `<img width="20%" alt="ducky" src="${IMAGE_1}" />`,
      `<img width="20%" alt="ducky" src="${IMAGE_1}" />`,
      `<img width="20%" alt="copilot" src="${IMAGE_3}" />`,
    ]),
    false
  );
})();

// checkDuckyMatches: mismatched alt and image returns false
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `<img width="20%" alt="ducky" src="${IMAGE_2}" />`,
      `<img width="20%" alt="mona" src="${IMAGE_2}" />`,
      `<img width="20%" alt="copilot" src="${IMAGE_3}" />`,
    ]),
    false
  );
})();

// checkDuckyMatches: wrong width returns false
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `<img width="25%" alt="ducky" src="${IMAGE_1}" />`,
      `<img width="20%" alt="mona" src="${IMAGE_2}" />`,
      `<img width="20%" alt="copilot" src="${IMAGE_3}" />`,
    ]),
    false
  );
})();

// checkDuckyMatches: markdown image syntax returns false
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `![ducky](${IMAGE_1})`,
      `![mona](${IMAGE_2})`,
      `![copilot](${IMAGE_3})`,
    ]),
    false
  );
})();

// checkDuckyMatches: hidden placeholder returns false
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `<img width="20%" alt="ducky" src="${IMAGE_1}" />`,
      `<img width="20%" alt="mona" src="${IMAGE_2}" />`,
      "`HIDDEN`",
    ]),
    false
  );
})();

// checkDuckyMatches: plain text returns false
(() => {
  assert.strictEqual(
    checkDuckyMatches([
      `Use this ${IMAGE_1}`,
      `<img width="20%" alt="mona" src="${IMAGE_2}" />`,
      `<img width="20%" alt="copilot" src="${IMAGE_3}" />`,
    ]),
    false
  );
})();

// checkDuckyMatches: non-array input returns false
(() => {
  assert.strictEqual(checkDuckyMatches(null), false);
})();

// If nothing threw an exception, all tests passed
console.log("All tests passed");
