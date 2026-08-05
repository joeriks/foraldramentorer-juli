import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  extractFeatureLinkIds,
  FEATURE_LINKS,
  resolveFeatureLink,
  routineSectionKey,
  routineSectionRoute
} from "../feature-links.js";
import { extractRoutineIllustrationIds, ROUTINE_ILLUSTRATIONS } from "../routine-illustrations.js";

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

test("numbered routine headings keep stable deep-link keys when titles change", () => {
  assert.equal(routineSectionKey("5.2 Öppna och bedöma ett ärende"), "5-2");
  assert.equal(routineSectionKey("5.2 Ny rubriktext"), "5-2");
  assert.equal(routineSectionKey("A.3 Kontakt och medverkan"), "a-3");
  assert.equal(routineSectionKey("Bilaga A: situationskatalog"), "bilaga-a");
  assert.equal(routineSectionRoute("5-2"), "#/routines/5-2");
});

test("every routine illustration is defined and links to a known feature", () => {
  const illustrationIds = extractRoutineIllustrationIds(routines);
  assert.equal(illustrationIds.length, 9);

  for (const illustrationId of illustrationIds) {
    const illustration = ROUTINE_ILLUSTRATIONS[illustrationId];
    assert.ok(illustration, `unknown routine illustration: ${illustrationId}`);
    assert.ok(resolveFeatureLink(illustration.featureId), `unknown illustration feature: ${illustration.featureId}`);
  }
});
