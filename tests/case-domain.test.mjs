import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionActivity,
  deriveCaseStatus,
  normalizeActivityStatus,
  normalizeCaseStatus,
  resultClassification,
  stableHash
} from "../case-domain.js";

test("normalizes legacy statuses without changing stable values", () => {
  assert.equal(normalizeCaseStatus("Kräver åtgärd"), "decision_required");
  assert.equal(normalizeCaseStatus("paused"), "paused");
  assert.equal(normalizeActivityStatus("Klar"), "completed");
  assert.equal(normalizeActivityStatus("waiting"), "waiting");
});

test("classifies acceptable and deviating activity results", () => {
  assert.equal(resultClassification("registryChecked", "shown_checked"), "acceptable");
  assert.equal(resultClassification("registryChecked", "authenticity_unconfirmed"), "deviation");
  assert.equal(resultClassification("registryChecked", "unknown"), null);
});

test("requires explicit reopen for completed activities", () => {
  assert.equal(canTransitionActivity("not_started", "completed"), true);
  assert.equal(canTransitionActivity("completed", "in_progress"), false);
  assert.equal(canTransitionActivity("completed", "in_progress", { reopen: true }), true);
});

test("derives waiting, decision and lifecycle statuses", () => {
  const caseRecord = { status: "in_progress" };
  assert.equal(deriveCaseStatus(caseRecord, [{ status: "waiting" }]), "waiting");
  assert.equal(deriveCaseStatus(caseRecord, [{ status: "completed" }], [{ status: "open", activeDecisionId: null }]), "decision_required");
  assert.equal(deriveCaseStatus({ status: "paused" }, [{ status: "in_progress" }]), "paused");
  assert.equal(deriveCaseStatus({ status: "closed" }, [{ status: "not_started" }]), "closed");
});

test("creates stable hashes independent of object key order", () => {
  assert.equal(stableHash({ a: 1, b: { c: 2 } }), stableHash({ b: { c: 2 }, a: 1 }));
  assert.notEqual(stableHash({ a: 1 }), stableHash({ a: 2 }));
});
