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

export const INTERACTION_TIMING_LABELS = {
  upcoming: "Kommande",
  today: "Idag",
  past_due: "Passerat, utfall saknas",
  completed: INTERACTION_STATUS_LABELS.completed,
  cancelled: INTERACTION_STATUS_LABELS.cancelled,
  no_show: INTERACTION_STATUS_LABELS.no_show
};

function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function interactionTimingState(record = {}, now = Date.now()) {
  if (["completed", "cancelled", "no_show"].includes(record.status)) return record.status;
  if (record.status !== "scheduled") return record.status || "scheduled";
  const startsAt = new Date(record.startsAt).getTime();
  if (!Number.isFinite(startsAt)) return "upcoming";
  if (startsAt < now) return "past_due";
  return localDateKey(startsAt) === localDateKey(now) ? "today" : "upcoming";
}

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

export function interactionParticipant({ partyType, partyId = null, displayName, roleLabel = "", phone = "", email = "", required = true }) {
  return {
    id: `${partyType}:${partyId || String(displayName || "extern").toLocaleLowerCase("sv-SE")}`,
    partyType,
    partyId,
    displayName: String(displayName || "").trim(),
    roleLabel: String(roleLabel || "").trim(),
    phone: String(phone || "").trim(),
    email: String(email || "").trim(),
    required: Boolean(required),
    invitationStatus: "not_prepared",
    responseStatus: "no_response",
    attendanceStatus: "not_recorded"
  };
}

export function suggestedInteractionParticipants({ parent = null, mentor = null, handler = null } = {}) {
  const contact = (record) => {
    const value = String(record?.contactDetails || record?.contact || "").trim();
    return value.includes("@") ? { email: value } : value ? { phone: value } : {};
  };
  return [
    parent ? interactionParticipant({ partyType: "parent", partyId: parent.id, displayName: parent.name, roleLabel: "Förälder", ...contact(parent) }) : null,
    mentor ? interactionParticipant({ partyType: "mentor", partyId: mentor.id, displayName: mentor.name, roleLabel: "Mentor", ...contact(mentor) }) : null,
    handler ? interactionParticipant({ partyType: "handler", partyId: handler.id, displayName: handler.name, roleLabel: handler.role || "Handläggare", email: handler.email || "", ...contact(handler) }) : null
  ].filter(Boolean);
}

export function normalizeInteraction(record = {}) {
  const startsAt = record.startsAt || record.occurredAt || record.createdAt || null;
  const reminderOffset = Number(record.reminder?.offsetMinutes);
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
    confirmationStatus: record.confirmationStatus === "proposed" ? "proposed" : "confirmed",
    participants: Array.isArray(record.participants) ? record.participants.map((participant) => ({
      ...participant,
      roleLabel: String(participant.roleLabel || "").trim(),
      phone: String(participant.phone || "").trim(),
      email: String(participant.email || "").trim()
    })) : [],
    title: String(record.title || "").trim(),
    location: String(record.location || "").trim(),
    invitationText: String(record.invitationText || "").trim(),
    reminder: {
      enabled: Boolean(record.reminder?.enabled),
      offsetMinutes: [60, 120, 1440, 2880].includes(reminderOffset) ? reminderOffset : 1440
    },
    communicationHistory: Array.isArray(record.communicationHistory)
      ? record.communicationHistory.filter((item) => item?.comment && item?.occurredAt).map((item) => ({
        id: String(item.id || ""),
        type: String(item.type || "other"),
        comment: String(item.comment || "").trim(),
        occurredAt: item.occurredAt,
        createdAt: item.createdAt || item.occurredAt,
        createdBy: item.createdBy || null
      }))
      : [],
    summary: String(record.summary || "").trim(),
    nextStep: String(record.nextStep || "").trim()
  };
}

export function nextScheduledMeetingForCase(records = [], caseId, now = Date.now()) {
  return records
    .filter((record) => record.caseId === caseId
      && record.kind === "meeting"
      && record.status === "scheduled"
      && record.confirmationStatus !== "proposed"
      && record.startsAt
      && new Date(record.startsAt).getTime() >= now)
    .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))[0] || null;
}

export function nextProposedMeetingForCase(records = [], caseId, now = Date.now()) {
  return records
    .filter((record) => record.caseId === caseId
      && record.kind === "meeting"
      && record.status === "scheduled"
      && record.confirmationStatus === "proposed"
      && record.startsAt
      && new Date(record.startsAt).getTime() >= now)
    .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))[0] || null;
}

export function plannedMeetingStarts({ firstStartsAt, frequency = "weekly", count = 4 } = {}) {
  const first = new Date(firstStartsAt);
  if (Number.isNaN(first.getTime())) return [];
  const total = Math.max(1, Math.min(24, Number(count) || 1));
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(first);
    if (frequency === "monthly") date.setMonth(date.getMonth() + index);
    else date.setDate(date.getDate() + index * (frequency === "biweekly" ? 14 : 7));
    return date.toISOString();
  });
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
    confirmationStatus: meeting.confirmationStatus,
    participants: meeting.participants?.length ? meeting.participants : participants,
    title: meeting.title || "Möte",
    mode: meeting.mode,
    location: meeting.location,
    invitationText: meeting.invitationText,
    reminder: meeting.reminder,
    communicationHistory: meeting.communicationHistory,
    summary: meeting.summary,
    nextStep: meeting.nextStep,
    rescheduledFromInteractionId: meeting.rescheduledFromInteractionId || null,
    scheduleSource: meeting.scheduleSource || null,
    scheduleIndex: Number.isInteger(meeting.scheduleIndex) ? meeting.scheduleIndex : null,
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
      && interaction.confirmationStatus !== "proposed"
      && Boolean(interaction.startsAt)
      && interaction.participants.length > 0;
  }
  return interaction.status === "completed"
    && Boolean(interaction.startsAt)
    && Boolean(interaction.summary);
}
