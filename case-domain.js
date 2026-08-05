export const DEFAULT_TENANT_ID = "demo-kommun";
export const DEFAULT_ORGANIZATION_UNIT_ID = "foraldramentorer";
export const AD_HOC_ACTIVITY_TEMPLATE_ID = "ad-hoc";

export const CASE_STATUS_LABELS = {
  new: "Nytt",
  in_progress: "Pågår",
  waiting: "Väntar",
  paused: "Pausat",
  decision_required: "Ställningstagande krävs",
  closed: "Avslutat"
};

export const ACTIVITY_STATUS_LABELS = {
  not_started: "Ej påbörjad",
  in_progress: "Pågår",
  waiting: "Väntar",
  completed: "Avslutad",
  not_applicable: "Ej aktuell"
};

const LEGACY_CASE_STATUS = {
  Nytt: "new",
  Pågår: "in_progress",
  Väntar: "waiting",
  Pausat: "paused",
  "Kräver åtgärd": "decision_required",
  "Redo för beslut": "in_progress",
  Avslutat: "closed"
};

const LEGACY_ACTIVITY_STATUS = {
  "Ej påbörjad": "not_started",
  Pågår: "in_progress",
  Väntar: "waiting",
  Klar: "completed",
  Avslutad: "completed",
  "Ej aktuell": "not_applicable"
};

export const ACTIVITY_TEMPLATES = [
  {
    id: "identityVerified",
    version: 1,
    title: "Verifiera identitet",
    results: [
      ["verified", "Verifierad", "acceptable"],
      ["not_verified", "Inte verifierad", "deviation"]
    ]
  },
  {
    id: "registryChecked",
    version: 1,
    title: "Kontrollera belastningsregister",
    results: [
      ["shown_checked", "Visat och kontrollerat", "acceptable"],
      ["not_shown", "Inte visat", "deviation"],
      ["authenticity_unconfirmed", "Äkthet inte bekräftad", "deviation"]
    ]
  },
  {
    id: "referencesDone",
    version: 1,
    title: "Kontrollera referenser",
    results: [
      ["acceptable", "Godtagbara", "acceptable"],
      ["not_acceptable", "Inte godtagbara", "deviation"],
      ["incomplete", "Ofullständiga", "deviation"]
    ]
  },
  {
    id: "trainingDone",
    version: 1,
    title: "Kontrollera e-learning",
    results: [
      ["completed", "Genomförd", "acceptable"],
      ["not_completed", "Inte genomförd", "deviation"]
    ]
  },
  {
    id: "quizDone",
    version: 1,
    title: "Kontrollera kunskapsavstämning",
    results: [
      ["passed", "Godkänd", "acceptable"],
      ["not_passed", "Inte godkänd", "deviation"]
    ]
  },
  {
    id: "inviteInterview",
    version: 1,
    title: "Kalla till intervju",
    results: [
      ["invitation_sent", "Kallelse skickad", "acceptable"],
      ["not_reached", "Kunde inte nå personen", "deviation"]
    ]
  },
  {
    id: "interviewDone",
    version: 1,
    title: "Genomför intervju",
    results: [
      ["completed", "Genomförd", "acceptable"],
      ["cancelled", "Inställd", "deviation"],
      ["no_show", "Uteblev", "deviation"]
    ]
  },
  {
    id: "decision",
    version: 1,
    title: "Fatta beslut om godkännande",
    results: [
      ["approved", "Godkänd", "acceptable"],
      ["not_approved", "Inte godkänd", "deviation"]
    ]
  },
  {
    id: AD_HOC_ACTIVITY_TEMPLATE_ID,
    version: 1,
    title: "Annan aktivitet",
    results: [
      ["completed", "Genomförd", "acceptable"],
      ["not_completed", "Kunde inte genomföras", "deviation"],
      ["not_assessable", "Ej bedömningsbar", "deviation"]
    ]
  }
];

export const CASE_TYPE_DEFINITIONS = [
  {
    id: "mentor-certification",
    version: 1,
    name: "Certifiering av mentor",
    defaultPriority: "normal",
    activityTemplateIds: ACTIVITY_TEMPLATES.slice(0, 8).map((template) => template.id)
  },
  {
    id: "mentor-follow-up",
    version: 1,
    name: "Uppföljning",
    defaultPriority: "normal",
    suggestedActivities: ["Kontakta mentorn", "Dokumentera uppföljningen", "Bedöm fortsatt behov"]
  },
  {
    id: "recruitment",
    version: 1,
    name: "Rekryteringsinsats",
    defaultPriority: "normal",
    suggestedActivities: ["Analysera behov", "Skapa platsannons", "Publicera annons", "Följ upp ansökningar"]
  },
  {
    id: "needs-analysis",
    version: 1,
    name: "Behovsanalys",
    defaultPriority: "normal",
    suggestedActivities: ["Samla in underlag", "Analysera behov", "Dokumentera slutsats"]
  },
  {
    id: "other",
    version: 1,
    name: "Övrigt ärende",
    defaultPriority: "normal",
    suggestedActivities: []
  }
];

export function caseTypeById(id) {
  return CASE_TYPE_DEFINITIONS.find((definition) => definition.id === id) || null;
}

export function caseTypeByName(name) {
  return CASE_TYPE_DEFINITIONS.find((definition) => definition.name === name) || caseTypeById("other");
}

export function activityTemplateById(id) {
  return ACTIVITY_TEMPLATES.find((template) => template.id === id) || ACTIVITY_TEMPLATES.at(-1);
}

export function normalizeCaseStatus(status) {
  return CASE_STATUS_LABELS[status] ? status : LEGACY_CASE_STATUS[status] || "new";
}

export function normalizeActivityStatus(status) {
  return ACTIVITY_STATUS_LABELS[status] ? status : LEGACY_ACTIVITY_STATUS[status] || "not_started";
}

export function caseStatusLabel(status) {
  return CASE_STATUS_LABELS[normalizeCaseStatus(status)];
}

export function activityStatusLabel(status) {
  return ACTIVITY_STATUS_LABELS[normalizeActivityStatus(status)];
}

export function resultDefinition(templateId, resultCode) {
  const result = activityTemplateById(templateId).results.find(([code]) => code === resultCode);
  return result ? { code: result[0], label: result[1], classification: result[2] } : null;
}

export function resultOptions(templateId) {
  return activityTemplateById(templateId).results.map(([code, label]) => [code, label]);
}

export function resultClassification(templateId, resultCode) {
  return resultDefinition(templateId, resultCode)?.classification || null;
}

export function deriveCaseStatus(caseRecord, activities, deviations = []) {
  const current = normalizeCaseStatus(caseRecord.status);
  if (current === "closed") return "closed";
  if (current === "paused") return "paused";
  if (deviations.some((deviation) => deviation.status === "open" && !deviation.activeDecisionId)) {
    return "decision_required";
  }

  const open = activities.filter((activity) => !["completed", "not_applicable"].includes(normalizeActivityStatus(activity.status)));
  const actionable = open.some((activity) => normalizeActivityStatus(activity.status) !== "waiting");
  if (activities.some((activity) => normalizeActivityStatus(activity.status) === "in_progress") || actionable && activities.some((activity) => normalizeActivityStatus(activity.status) !== "not_started")) {
    return "in_progress";
  }
  if (open.length && open.every((activity) => normalizeActivityStatus(activity.status) === "waiting")) return "waiting";
  if (!open.length && activities.length) return "in_progress";
  return "new";
}

const ACTIVITY_TRANSITIONS = {
  not_started: new Set(["in_progress", "waiting", "completed", "not_applicable"]),
  in_progress: new Set(["waiting", "completed", "not_applicable"]),
  waiting: new Set(["in_progress", "completed", "not_applicable"]),
  completed: new Set(),
  not_applicable: new Set()
};

export function canTransitionActivity(from, to, { reopen = false } = {}) {
  const source = normalizeActivityStatus(from);
  const target = normalizeActivityStatus(to);
  if (source === target) return true;
  if (reopen && source === "completed" && target === "in_progress") return true;
  if (reopen && source === "not_applicable" && target === "not_started") return true;
  return ACTIVITY_TRANSITIONS[source]?.has(target) || false;
}

export function stableHash(value) {
  const canonicalize = (item) => {
    if (Array.isArray(item)) return item.map(canonicalize);
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.keys(item).sort().map((key) => [key, canonicalize(item[key])]));
    }
    return item;
  };
  const text = JSON.stringify(canonicalize(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
