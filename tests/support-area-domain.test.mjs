import test from "node:test";
import assert from "node:assert/strict";
import {
  MENTOR_EXPERIENCE_LEVELS,
  SUPPORT_AREAS,
  defaultTenantSupportAreaSelections,
  normalizeSupportAreaIds,
  selectedSupportAreas,
  supportAreaOverlap
} from "../support-area-domain.js";

test("mentor experience bases use explicit non-overlapping labels", () => {
  assert.deepEqual(MENTOR_EXPERIENCE_LEVELS, [
    ["lived", "Egen eller närståendes erfarenhet"],
    ["practical", "Erfarenhet av att stödja andra"],
    ["trained", "Utbildning eller yrkeserfarenhet"]
  ]);
});

test("support area ids are stable and unique", () => {
  assert.equal(new Set(SUPPORT_AREAS.map((area) => area.id)).size, SUPPORT_AREAS.length);
  assert.ok(SUPPORT_AREAS.length >= 12);
  assert.ok(SUPPORT_AREAS.every((area) => area.scopeNote && area.publicDescription));
});

test("municipality selection controls enabled and public areas", () => {
  const selections = defaultTenantSupportAreaSelections("tenant", "actor", "2026-08-08T10:00:00Z");
  selections[0].public = false;
  selections[1].enabled = false;
  assert.equal(selectedSupportAreas(selections).length, SUPPORT_AREAS.length - 1);
  assert.equal(selectedSupportAreas(selections, "public").length, SUPPORT_AREAS.length - 2);
});

test("overlap uses controlled ids and ignores unknown values", () => {
  const needIds = normalizeSupportAreaIds(["school-absence", "school-absence", "unknown"]);
  const overlap = supportAreaOverlap(needIds, [
    { areaId: "school-absence", experienceLevel: "practical" },
    { areaId: "boundaries", experienceLevel: "trained" }
  ]);
  assert.deepEqual(overlap.map((area) => area.id), ["school-absence"]);
});
