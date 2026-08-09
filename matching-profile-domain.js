import { normalizeSupportAreaIds } from "./support-area-domain.js";

export const MENTOR_SUPPORT_CONFIDENCE_LEVELS = [
  ["some", "Viss trygghet"],
  ["good", "God trygghet"],
  ["very_good", "Mycket god trygghet"]
];

const VALID_CONFIDENCE_LEVELS = new Set(MENTOR_SUPPORT_CONFIDENCE_LEVELS.map(([id]) => id));

function normalizeText(value) {
  return String(value || "").trim();
}

function languageId(label) {
  return normalizeText(label)
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeLanguageEntries(value, { firstIsPreferred = false } = {}) {
  const source = Array.isArray(value)
    ? value
    : normalizeText(value).split(/[,;]+/).map((label) => ({ label }));
  const seen = new Set();
  return source.map((entry, index) => {
    const label = normalizeText(typeof entry === "string" ? entry : entry.label || entry.name);
    const id = normalizeText(typeof entry === "object" ? entry.languageId : "") || languageId(label);
    if (!label || !id || seen.has(id)) return null;
    seen.add(id);
    return {
      languageId: id,
      label,
      preference: typeof entry === "object" && entry.preference
        ? entry.preference
        : firstIsPreferred && index === 0 ? "preferred" : "accepted",
      conversationLevel: typeof entry === "object" && entry.conversationLevel
        ? entry.conversationLevel
        : "works_well"
    };
  }).filter(Boolean);
}

export function normalizeMentorProfileAreas(entries) {
  const source = Array.isArray(entries) ? entries : [];
  const ids = new Set(normalizeSupportAreaIds(source.map((entry) => typeof entry === "string" ? entry : entry.areaId)));
  return source
    .map((entry) => typeof entry === "string" ? { areaId: entry } : entry)
    .filter((entry) => ids.has(entry.areaId))
    .map((entry) => ({
      supportAreaId: entry.areaId,
      confidenceLevel: VALID_CONFIDENCE_LEVELS.has(entry.confidenceLevel) ? entry.confidenceLevel : "good",
      experienceLevels: [...new Set(Array.isArray(entry.experienceLevels)
        ? entry.experienceLevels
        : entry.experienceLevel ? [entry.experienceLevel] : [])],
      verified: Boolean(entry.verified),
      verifiedAt: entry.verifiedAt || null,
      verifiedBy: entry.verifiedBy || null
    }));
}

export function activeProfileFor(records, ownerKey, ownerId) {
  return (records || [])
    .filter((record) => record[ownerKey] === ownerId && record.status === "active")
    .sort((left, right) => Number(right.version || 0) - Number(left.version || 0))[0] || null;
}

export function buildMentorMatchingProfile({ tenantId, mentor, profileId, previousProfile = null, actorId, now }) {
  const profile = {
    id: profileId,
    tenantId,
    mentorId: mentor.id,
    version: Number(previousProfile?.version || 0) + 1,
    status: "active",
    area: normalizeText(mentor.area) || null,
    availability: normalizeText(mentor.availability) || null,
    meetingModes: Array.isArray(mentor.meetingModes) ? [...new Set(mentor.meetingModes)] : [],
    availableAssignmentCapacity: mentor.availableAssignmentCapacity == null ? null : Number(mentor.availableAssignmentCapacity),
    createdAt: now,
    createdBy: actorId,
    updatedAt: now,
    updatedBy: actorId
  };
  const supportAreas = normalizeMentorProfileAreas(mentor.supportAreas).map((entry) => ({
    tenantId,
    profileId,
    mentorId: mentor.id,
    ...entry
  }));
  const languages = normalizeLanguageEntries(mentor.languages).map((entry) => ({
    tenantId,
    profileId,
    mentorId: mentor.id,
    ...entry
  }));
  return { profile, supportAreas, languages };
}

export function buildSupportMatchingProfile({ tenantId, supportCase, profileId, previousProfile = null, actorId, now }) {
  const details = supportCase.details || {};
  const profile = {
    id: profileId,
    tenantId,
    supportCaseId: supportCase.id,
    parentId: supportCase.parentId || null,
    version: Number(previousProfile?.version || 0) + 1,
    status: "active",
    area: normalizeText(details.area) || null,
    availability: normalizeText(details.availability) || null,
    preferredMeetingModes: Array.isArray(details.preferredMeetingModes) ? [...new Set(details.preferredMeetingModes)] : [],
    sharedExperiencePreference: details.sharedExperiencePreference || null,
    complementarySupport: details.complementarySupport ? JSON.parse(JSON.stringify(details.complementarySupport)) : null,
    createdAt: now,
    createdBy: actorId,
    updatedAt: now,
    updatedBy: actorId
  };
  const supportAreas = normalizeSupportAreaIds(details.supportAreaIds).map((supportAreaId, index) => ({
    tenantId,
    profileId,
    supportCaseId: supportCase.id,
    supportAreaId,
    priority: index === 0 ? "primary" : "additional"
  }));
  const languages = normalizeLanguageEntries(details.languages, { firstIsPreferred: true }).map((entry) => ({
    tenantId,
    profileId,
    supportCaseId: supportCase.id,
    ...entry
  }));
  return { profile, supportAreas, languages };
}

export function projectMentorMatchingProfile(profile, supportAreas, languages) {
  if (!profile) return null;
  const areaRows = (supportAreas || []).filter((entry) => entry.profileId === profile.id);
  const languageRows = (languages || []).filter((entry) => entry.profileId === profile.id);
  return {
    area: profile.area || "",
    availability: profile.availability || "",
    languages: languageRows.map((entry) => entry.label).join(", "),
    supportAreas: areaRows.map((entry) => ({
      areaId: entry.supportAreaId,
      confidenceLevel: entry.confidenceLevel,
      experienceLevels: [...(entry.experienceLevels || [])],
      verified: Boolean(entry.verified),
      verifiedAt: entry.verifiedAt || null,
      verifiedBy: entry.verifiedBy || null
    })),
    matchingProfile: {
      id: profile.id,
      version: profile.version,
      status: profile.status,
      updatedAt: profile.updatedAt,
      updatedBy: profile.updatedBy
    }
  };
}

export function buildMatchingSnapshot({ tenantId, matchingCase, mentorProfile, mentorAreas, mentorLanguages, supportProfile, supportAreas, supportLanguages, snapshotId, actorId, now }) {
  const needIds = new Set((supportAreas || []).filter((entry) => entry.profileId === supportProfile?.id).map((entry) => entry.supportAreaId));
  const mentorIds = new Set((mentorAreas || []).filter((entry) => entry.profileId === mentorProfile?.id).map((entry) => entry.supportAreaId));
  return {
    id: snapshotId,
    tenantId,
    matchingCaseId: matchingCase.id,
    supportCaseId: matchingCase.supportCaseId,
    mentorId: matchingCase.mentorId,
    parentId: matchingCase.parentId,
    supportProfile: supportProfile ? {
      id: supportProfile.id,
      version: supportProfile.version,
      area: supportProfile.area,
      availability: supportProfile.availability,
      supportAreas: (supportAreas || []).filter((entry) => entry.profileId === supportProfile.id).map((entry) => ({ ...entry })),
      languages: (supportLanguages || []).filter((entry) => entry.profileId === supportProfile.id).map((entry) => ({ ...entry }))
    } : null,
    mentorProfile: mentorProfile ? {
      id: mentorProfile.id,
      version: mentorProfile.version,
      area: mentorProfile.area,
      availability: mentorProfile.availability,
      supportAreas: (mentorAreas || []).filter((entry) => entry.profileId === mentorProfile.id).map((entry) => ({ ...entry })),
      languages: (mentorLanguages || []).filter((entry) => entry.profileId === mentorProfile.id).map((entry) => ({ ...entry }))
    } : null,
    overlapSupportAreaIds: [...needIds].filter((id) => mentorIds.has(id)),
    createdAt: now,
    createdBy: actorId
  };
}
