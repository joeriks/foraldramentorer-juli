import assert from "node:assert/strict";
import {
  AVAILABILITY_OPTIONS,
  DEFAULT_GEOGRAPHIC_AREAS,
  LANGUAGE_OPTIONS,
  defaultTenantGeographicAreas,
  selectionsOverlap,
  slugifyCatalogLabel,
  structuredLanguageEntries
} from "../matching-catalog-domain.js";

assert.equal(DEFAULT_GEOGRAPHIC_AREAS.length, 7);
assert.ok(LANGUAGE_OPTIONS.some(([id]) => id === "svenska"));
assert.equal(AVAILABILITY_OPTIONS.length, 5);
assert.deepEqual(selectionsOverlap(["a", "b"], ["b", "c"]), ["b"]);
assert.deepEqual(structuredLanguageEntries(["svenska", "arabiska"]), [
  { languageId: "svenska", label: "Svenska" },
  { languageId: "arabiska", label: "Arabiska" }
]);
assert.equal(slugifyCatalogLabel("Skälby / Norra"), "skalby-norra");
assert.ok(defaultTenantGeographicAreas("tenant-1").every((area) => area.tenantId === "tenant-1" && area.active));

console.log("matching-catalog-domain tests passed");
