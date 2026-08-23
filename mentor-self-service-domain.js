const PROFILE_FIELD_LABELS = {
  name: "Namn",
  email: "E-post",
  phone: "Telefon",
  geographicAreaIds: "Geografiska områden",
  languageIds: "Språk",
  availabilitySlotIds: "Tillgänglighet",
  availabilityNote: "Kommentar om tillgänglighet",
  meetingModes: "Mötesformer",
  availableAssignmentCapacity: "Kapacitet för uppdrag",
  supportAreas: "Erfarenhetsområden"
};

function uniqueSorted(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right, "sv"));
}

function normalizedSupportAreas(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => ({
      areaId: String(entry?.areaId || "").trim(),
      confidenceLevel: String(entry?.confidenceLevel || "good"),
      experienceLevels: uniqueSorted(entry?.experienceLevels)
    }))
    .filter((entry) => entry.areaId)
    .sort((left, right) => left.areaId.localeCompare(right.areaId, "sv"));
}

export function mentorSelfServiceSnapshot(mentor = {}) {
  return {
    name: String(mentor.name || "").trim(),
    email: String(mentor.email || "").trim().toLocaleLowerCase("sv-SE"),
    phone: String(mentor.phone || "").trim(),
    geographicAreaIds: uniqueSorted(mentor.geographicAreaIds),
    languageIds: uniqueSorted(mentor.languageIds || mentor.languageEntries?.map((entry) => entry.languageId)),
    availabilitySlotIds: uniqueSorted(mentor.availabilitySlotIds),
    availabilityNote: String(mentor.availabilityNote || "").trim(),
    meetingModes: uniqueSorted(mentor.meetingModes),
    availableAssignmentCapacity: mentor.availableAssignmentCapacity == null || mentor.availableAssignmentCapacity === ""
      ? null
      : Math.max(0, Number(mentor.availableAssignmentCapacity)),
    supportAreas: normalizedSupportAreas(mentor.supportAreas)
  };
}

export function mentorSelfServiceChanges(beforeMentor, afterMentor) {
  const before = mentorSelfServiceSnapshot(beforeMentor);
  const after = mentorSelfServiceSnapshot(afterMentor);
  return Object.keys(PROFILE_FIELD_LABELS)
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field, label: PROFILE_FIELD_LABELS[field], before: before[field], after: after[field] }));
}

export function mergeSelfReportedSupportAreas(previousEntries = [], submittedEntries = []) {
  const previousById = new Map((Array.isArray(previousEntries) ? previousEntries : []).map((entry) => [entry.areaId, entry]));
  return normalizedSupportAreas(submittedEntries).map((submitted) => {
    const previous = previousById.get(submitted.areaId);
    const unchanged = previous
      && String(previous.confidenceLevel || "good") === submitted.confidenceLevel
      && JSON.stringify(uniqueSorted(previous.experienceLevels)) === JSON.stringify(submitted.experienceLevels);
    return {
      ...submitted,
      verified: Boolean(unchanged && previous.verified),
      verifiedAt: unchanged ? previous.verifiedAt || null : null,
      verifiedBy: unchanged ? previous.verifiedBy || null : null
    };
  });
}

export function createMentorProfileEvent({ id, tenantId, mentorId, beforeMentor, afterMentor, actorId, actorName, now, matchingProfileVersion = null }) {
  const changes = mentorSelfServiceChanges(beforeMentor, afterMentor);
  if (!changes.length) return null;
  return {
    id,
    tenantId,
    mentorId,
    eventType: "mentor_profile_self_updated",
    source: "mentor_portal",
    schemaVersion: 1,
    actorId,
    actorName,
    occurredAt: now,
    matchingProfileVersion,
    changes,
    snapshot: mentorSelfServiceSnapshot(afterMentor)
  };
}
