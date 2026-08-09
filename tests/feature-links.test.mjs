import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  extractFeatureLinkIds,
  FEATURE_LINKS,
  resolveFeatureLink,
  resolveFeatureRoute,
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

test("demo mode and support queue use stable administration routes", () => {
  assert.equal(resolveFeatureLink("admin.demo").href, "#/presentation");
  assert.equal(resolveFeatureLink("admin.support").href, "#/support-admin");
});

test("dynamic feature routes resolve stable record links", () => {
  assert.equal(resolveFeatureRoute("case.activity", { caseId: "case-1", activityId: "activity-2" }), "#/case/case-1/activities/activity-2");
  assert.equal(resolveFeatureRoute("case.edit", { caseId: "case-1", activityId: "activity-2" }), "#/case/case-1/edit/activity-2");
  assert.equal(resolveFeatureRoute("case.matching", { caseId: "case-1", activityId: "activity-2" }), "#/case/case-1/matching/activity-2");
  assert.equal(resolveFeatureRoute("case.meetings", { caseId: "case-1", activityId: "activity-2" }), "#/case/case-1/meetings/activity-2");
  assert.equal(resolveFeatureRoute("mentor.identity", { mentorId: "mentor-1", caseId: "case-1", activityId: "activity-2" }), "#/mentor/mentor-1/identity/case-1/activity-2");
  assert.equal(resolveFeatureRoute("mentor.identity", { mentorId: "mentor-1" }), null);
  assert.equal(resolveFeatureRoute("case.activity", { caseId: "case-1" }), null);
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
  assert.equal(illustrationIds.length, 10);

  for (const illustrationId of illustrationIds) {
    const illustration = ROUTINE_ILLUSTRATIONS[illustrationId];
    assert.ok(illustration, `unknown routine illustration: ${illustrationId}`);
    if (illustration.featureId) {
      assert.ok(resolveFeatureLink(illustration.featureId), `unknown illustration feature: ${illustration.featureId}`);
    }
  }
  assert.equal(ROUTINE_ILLUSTRATIONS["parent-registration"].featureId, "parent.create");
});

test("uses parent terminology without introducing a recipient abstraction", () => {
  assert.match(routines, /Registrera förälder/);
  assert.match(routines, /Matcha stödärende med mentor/);
  assert.match(routines, /annat stödbehov/i);
  assert.match(routines, /flera samtidiga uppdrag/i);
  assert.match(routines, /När uppdraget skapas får det en oföränderlig referens till stödärendet/);
  assert.match(routines, /Sammanhållna men valbara övergångar/);
  assert.match(routines, /Nästa steg är förvalt, men användaren får avmarkera/);
  assert.doesNotMatch(routines, /stödmottagare/i);
  assert.doesNotMatch(routines, /familjebehov|familjen/i);
});
