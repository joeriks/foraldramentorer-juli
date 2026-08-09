import test from "node:test";
import assert from "node:assert/strict";
import {
  activeProfileFor,
  buildMatchingSnapshot,
  buildMentorMatchingProfile,
  buildSupportMatchingProfile,
  normalizeLanguageEntries,
  normalizeMentorProfileAreas,
  projectMentorMatchingProfile
} from "../matching-profile-domain.js";

const now = "2026-08-09T10:00:00.000Z";

test("language values become stable child records", () => {
  assert.deepEqual(normalizeLanguageEntries("Svenska, Arabiska, svenska"), [
    { languageId: "svenska", label: "Svenska", preference: "accepted", conversationLevel: "works_well" },
    { languageId: "arabiska", label: "Arabiska", preference: "accepted", conversationLevel: "works_well" }
  ]);
});

test("mentor support areas retain confidence and multiple experience bases", () => {
  assert.deepEqual(normalizeMentorProfileAreas([{ areaId: "school-absence", confidenceLevel: "very_good", experienceLevels: ["lived", "practical"] }]), [{
    supportAreaId: "school-absence",
    confidenceLevel: "very_good",
    experienceLevels: ["lived", "practical"],
    verified: false,
    verifiedAt: null,
    verifiedBy: null
  }]);
});

test("the highest active profile is selected", () => {
  assert.equal(activeProfileFor([
    { mentorId: "m1", version: 1, status: "superseded" },
    { mentorId: "m1", version: 2, status: "active" },
    { mentorId: "m1", version: 3, status: "active" }
  ], "mentorId", "m1").version, 3);
});

test("mentor profile projects to the existing read model", () => {
  const built = buildMentorMatchingProfile({
    tenantId: "t1", mentor: { id: "m1", area: "Norr", availability: "Kvällar", languages: "Svenska", supportAreas: [{ areaId: "school-absence", confidenceLevel: "good", experienceLevels: ["lived"] }] },
    profileId: "mp1", actorId: "h1", now
  });
  const view = projectMentorMatchingProfile(built.profile, built.supportAreas, built.languages);
  assert.equal(view.languages, "Svenska");
  assert.equal(view.supportAreas[0].confidenceLevel, "good");
  assert.equal(view.matchingProfile.version, 1);
});

test("matching snapshot freezes both profiles and overlap", () => {
  const mentor = buildMentorMatchingProfile({ tenantId: "t1", mentor: { id: "m1", supportAreas: [{ areaId: "school-absence" }], languages: "Svenska" }, profileId: "mp1", actorId: "h1", now });
  const support = buildSupportMatchingProfile({ tenantId: "t1", supportCase: { id: "s1", parentId: "p1", details: { supportAreaIds: ["school-absence", "boundaries"], languages: "Svenska" } }, profileId: "sp1", actorId: "h1", now });
  const snapshot = buildMatchingSnapshot({ tenantId: "t1", matchingCase: { id: "c1", supportCaseId: "s1", mentorId: "m1", parentId: "p1" }, mentorProfile: mentor.profile, mentorAreas: mentor.supportAreas, mentorLanguages: mentor.languages, supportProfile: support.profile, supportAreas: support.supportAreas, supportLanguages: support.languages, snapshotId: "snap1", actorId: "h1", now });
  mentor.supportAreas[0].supportAreaId = "boundaries";
  assert.deepEqual(snapshot.overlapSupportAreaIds, ["school-absence"]);
  assert.equal(snapshot.mentorProfile.supportAreas[0].supportAreaId, "school-absence");
});
