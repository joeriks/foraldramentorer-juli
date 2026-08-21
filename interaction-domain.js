export const INTERACTION_KIND_LABELS = {
  meeting: "Möte",
  phone: "Telefonsamtal",
  email: "E-post",
  visit: "Besök",
  other: "Annan kontakt"
};

export const INTERACTION_STATUS_LABELS = {
  scheduled: "Bokat",
  completed: "Genomfört",
  cancelled: "Inställt",
  no_show: "Uteblev"
};

export function interactionStatusFromForm({ scheduled, kind, outcomeStatus = "completed" }) {
  if (scheduled) return "scheduled";
  return kind === "meeting" ? outcomeStatus : "completed";
}

export function validateInteractionForSave({ status, startsAt, endsAt = null, participants = [], summary = "", now = Date.now() }) {
  return {
    startsAt: status === "completed" && new Date(startsAt).getTime() > now
      ? "En genomförd kontakt kan inte ha en tidpunkt i framtiden."
      : "",
    endsAt: status === "scheduled" && new Date(endsAt).getTime() <= new Date(startsAt).getTime()
      ? "Sluttiden måste vara efter starttiden."
      : "",
    participants: status === "scheduled" && !participants.length
      ? "Lägg till minst en deltagare."
      : "",
    summary: status !== "scheduled" && !String(summary).trim()
      ? "En kort anteckning krävs."
      : ""
  };
}

export function interactionParticipant({ partyType, partyId = null, displayName, required = true }) {
  return {
    id: `${partyType}:${partyId || String(displayName || "extern").toLocaleLowerCase("sv-SE")}`,
    partyType,
    partyId,
    displayName: String(displayName || "").trim(),
    required: Boolean(required),
    invitationStatus: "not_prepared",
    responseStatus: "no_response",
    attendanceStatus: "not_recorded"
  };
}

export function suggestedInteractionParticipants({ parent = null, mentor = null, handler = null } = {}) {
  return [
    parent ? interactionParticipant({ partyType: "parent", partyId: parent.id, displayName: parent.name }) : null,
    mentor ? interactionParticipant({ partyType: "mentor", partyId: mentor.id, displayName: mentor.name }) : null,
    handler ? interactionParticipant({ partyType: "handler", partyId: handler.id, displayName: handler.name }) : null
  ].filter(Boolean);
}

export function normalizeInteraction(record = {}) {
  const startsAt = record.startsAt || record.occurredAt || record.createdAt || null;
  return {
    ...record,
    kind: record.kind || "meeting",
    status: record.status || (record.completedAt ? "completed" : "scheduled"),
    direction: record.direction || "not_applicable",
    startsAt,
    endsAt: record.endsAt || null,
    caseId: record.caseId || null,
    activityId: record.activityId || null,
    organizerId: record.organizerId || record.createdBy || null,
    participants: Array.isArray(record.participants) ? record.participants : [],
    title: String(record.title || "").trim(),
    location: String(record.location || "").trim(),
    invitationText: String(record.invitationText || "").trim(),
    summary: String(record.summary || "").trim(),
    nextStep: String(record.nextStep || "").trim()
  };
}

export function interactionFromCaseMeeting(meeting, participants = []) {
  return normalizeInteraction({
    id: meeting.interactionId || `meeting:${meeting.id}`,
    tenantId: meeting.tenantId,
    kind: "meeting",
    status: meeting.meetingStatus || "scheduled",
    direction: "not_applicable",
    startsAt: meeting.startsAt || meeting.occurredAt,
    endsAt: meeting.endsAt || null,
    caseId: meeting.caseId,
    activityId: meeting.activityId,
    organizerId: meeting.organizerId || meeting.createdBy,
    participants: meeting.participants?.length ? meeting.participants : participants,
    title: meeting.title || "Möte",
    mode: meeting.mode,
    location: meeting.location,
    invitationText: meeting.invitationText,
    summary: meeting.summary,
    nextStep: meeting.nextStep,
    rescheduledFromInteractionId: meeting.rescheduledFromInteractionId || null,
    sourceType: "case_meeting",
    sourceId: meeting.id,
    createdAt: meeting.createdAt,
    createdBy: meeting.createdBy,
    updatedAt: meeting.updatedAt,
    updatedBy: meeting.updatedBy
  });
}

export function interactionFromIncomingContact(contact) {
  return normalizeInteraction({
    id: contact.interactionId || `contact:${contact.id}`,
    tenantId: contact.tenantId,
    kind: contact.channel || "other",
    status: "completed",
    direction: "incoming",
    startsAt: contact.occurredAt,
    caseId: contact.caseId || contact.intakeCaseId || null,
    organizerId: contact.receivedBy || contact.createdBy,
    participants: contact.parentId || contact.parentName
      ? [interactionParticipant({ partyType: contact.parentId ? "parent" : "external", partyId: contact.parentId, displayName: contact.parentName || contact.contactDetails })]
      : [],
    title: contact.summary?.split(/[.!?\n]/)[0] || "Inkommande kontakt",
    summary: contact.summary,
    nextStep: contact.nextStep,
    sourceType: "incoming_contact",
    sourceId: contact.id,
    createdAt: contact.createdAt,
    createdBy: contact.createdBy,
    updatedAt: contact.updatedAt,
    updatedBy: contact.updatedBy
  });
}

export function meetingSatisfiesRequirement(interaction, requirement = "completed") {
  if (!interaction || interaction.kind !== "meeting") return false;
  if (requirement === "scheduled") {
    return ["scheduled", "completed"].includes(interaction.status)
      && Boolean(interaction.startsAt)
      && interaction.participants.length > 0;
  }
  return interaction.status === "completed"
    && Boolean(interaction.startsAt)
    && Boolean(interaction.summary);
}
