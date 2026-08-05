import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractFeatureLinkIds, FEATURE_LINKS, resolveFeatureLink } from "../feature-links.js";

const routines = await readFile(
  new URL("../docs/verksamhetsfloden-och-handlaggningsrutiner.md", import.meta.url),
  "utf8"
);

test("every feature link in the routines document resolves to a route", () => {
  const featureIds = extractFeatureLinkIds(routines);
  assert.ok(featureIds.length > 0, "the routines document should contain feature links");

  for (const featureId of featureIds) {
    const feature = resolveFeatureLink(featureId);
    assert.ok(feature, `unknown feature link: ${featureId}`);
    assert.match(feature.href, /^#\//, `feature link must use an application route: ${featureId}`);
  }
});

test("the feature registry uses stable unique routes", () => {
  const routes = Object.values(FEATURE_LINKS).map((feature) => feature.href);
  assert.equal(new Set(routes).size, routes.length);
});
