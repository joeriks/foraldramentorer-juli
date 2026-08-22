const uniqueStrings = (values) => [...new Set((Array.isArray(values) ? values : [])
  .map((value) => String(value || "").trim())
  .filter(Boolean))];

const normalizeContact = (value) => String(value || "").trim();

export const MENTOR_APPLICATION_STATUS_LABELS = {
  draft: "Utkast",
  submitted: "Mottagen",
  needs_completion: "Komplettering behövs",
  converted: "Överförd till mentorregistret",
  withdrawn: "Återkallad"
};

export function normalizeMentorApplication(application = {}) {
  return {
    ...application,
    tenantId: application.tenantId || null,
    reference: String(application.reference || "").trim(),
    status: Object.hasOwn(MENTOR_APPLICATION_STATUS_LABELS, application.status) ? application.status : "draft",
    version: Math.max(1, Number(application.version || 1)),
    name: normalizeContact(application.name),
    email: normalizeContact(application.email).toLocaleLowerCase("sv-SE"),
    phone: normalizeContact(application.phone),
    geographicAreaIds: uniqueStrings(application.geographicAreaIds),
    languageIds: uniqueStrings(application.languageIds),
    availabilitySlotIds: uniqueStrings(application.availabilitySlotIds),
    supportAreas: Array.isArray(application.supportAreas) ? application.supportAreas.map((entry) => ({
      areaId: String(entry.areaId || "").trim(),
      confidenceLevel: String(entry.confidenceLevel || "good").trim(),
      experienceLevels: uniqueStrings(entry.experienceLevels)
    })).filter((entry) => entry.areaId) : [],
    motivation: String(application.motivation || "").trim(),
    consentGivenAt: application.consentGivenAt || null,
    mentorId: application.mentorId || null,
    history: Array.isArray(application.history) ? application.history.filter((event) => event?.occurredAt && event?.message) : []
  };
}

export function mentorApplicationMissingFields(application) {
  const normalized = normalizeMentorApplication(application);
  const missing = [];
  if (!normalized.name) missing.push("Namn");
  if (!normalized.email && !normalized.phone) missing.push("E-post eller telefon");
  if (!normalized.geographicAreaIds.length) missing.push("Geografiskt område");
  if (!normalized.languageIds.length) missing.push("Språk");
  if (!normalized.availabilitySlotIds.length) missing.push("Tillgänglighet");
  if (!normalized.supportAreas.length) missing.push("Minst ett stödområde");
  if (normalized.supportAreas.some((entry) => !entry.experienceLevels.length)) missing.push("Erfarenhetsgrund för valda stödområden");
  if (!normalized.motivation) missing.push("Motivation");
  if (!normalized.consentGivenAt) missing.push("Godkännande att kommunen kontaktar dig");
  return missing;
}

export function submitMentorApplication(application, { now, actorId = "applicant" }) {
  const normalized = normalizeMentorApplication(application);
  const missing = mentorApplicationMissingFields(normalized);
  if (missing.length) throw new Error(`Ansökan saknar: ${missing.join(", ")}.`);
  return normalizeMentorApplication({
    ...normalized,
    status: "submitted",
    submittedAt: normalized.submittedAt || now,
    updatedAt: now,
    updatedBy: actorId,
    version: normalized.version + 1,
    history: [...normalized.history, {
      eventType: "application_submitted",
      occurredAt: now,
      actorId,
      message: "Intresseanmälan skickades till kommunen."
    }]
  });
}

export function convertMentorApplication(application, { mentorId, now, actorId }) {
  const normalized = normalizeMentorApplication(application);
  if (normalized.status === "converted") throw new Error("Ansökan är redan överförd till mentorregistret.");
  if (mentorApplicationMissingFields(normalized).length) throw new Error("Ansökan måste vara fullständig innan den överförs.");
  return normalizeMentorApplication({
    ...normalized,
    status: "converted",
    mentorId,
    convertedAt: now,
    convertedBy: actorId,
    updatedAt: now,
    updatedBy: actorId,
    version: normalized.version + 1,
    history: [...normalized.history, {
      eventType: "application_converted",
      occurredAt: now,
      actorId,
      message: "Ansökan överfördes till mentorregistret och godkännandeflödet startades."
    }]
  });
}

export function mentorApplicationDuplicateCandidates(application, candidates = []) {
  const normalized = normalizeMentorApplication(application);
  const email = normalized.email;
  const phoneDigits = normalized.phone.replace(/\D/g, "");
  const name = normalized.name.toLocaleLowerCase("sv-SE").replace(/\s+/g, " ");
  return candidates.filter((candidate) => {
    const contact = String(candidate.contactDetails || candidate.contact || "").toLocaleLowerCase("sv-SE");
    const candidateName = String(candidate.name || "").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g, " ");
    return Boolean(email && contact.includes(email))
      || Boolean(phoneDigits.length >= 7 && contact.replace(/\D/g, "").includes(phoneDigits))
      || Boolean(name && candidateName === name);
  });
}
