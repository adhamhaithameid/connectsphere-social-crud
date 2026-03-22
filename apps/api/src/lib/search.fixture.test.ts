import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { matchesSearchQuery, normalizeSearchText, splitSearchTokens } from "./search.js";

interface SearchFixture {
  id: string;
  description: string;
  query: string;
  fields: Array<string | null>;
  expected: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "search-fixtures");

async function readFixtures(): Promise<SearchFixture[]> {
  const files = (await fs.readdir(fixturesDir))
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const fixtures = await Promise.all(
    files.map(async (file) => {
      const fixturePath = path.join(fixturesDir, file);
      const raw = await fs.readFile(fixturePath, "utf8");
      return JSON.parse(raw) as SearchFixture;
    })
  );

  return fixtures;
}

test("normalizeSearchText removes accents and punctuation", () => {
  assert.equal(normalizeSearchText("  Café, au-lait!  "), "cafe au lait");
  assert.equal(normalizeSearchText(""), "");
  assert.equal(normalizeSearchText(undefined), "");
});

test("splitSearchTokens returns normalized tokens", () => {
  assert.deepEqual(splitSearchTokens("Hello,   World"), ["hello", "world"]);
  assert.deepEqual(splitSearchTokens("   "), []);
});

test("matchesSearchQuery validates all fixture scenarios", async (t) => {
  const fixtures = await readFixtures();
  assert.ok(fixtures.length > 0, "expected at least one search fixture");

  for (const fixture of fixtures) {
    await t.test(`${fixture.id} ${fixture.description}`, () => {
      const actual = matchesSearchQuery(fixture.fields, fixture.query);
      assert.equal(actual, fixture.expected);
    });
  }
});
