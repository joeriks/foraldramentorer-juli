export const GUIDED_STEP_STATUS_LABELS = {
  not_started: "Inte påbörjat",
  in_progress: "Pågår",
  complete: "Klart",
  blocked: "Blockerat",
  not_applicable: "Ej aktuellt"
};

export const GUIDED_STEP_STATUSES = new Set(Object.keys(GUIDED_STEP_STATUS_LABELS));

function normalizedTemplateSteps(definition) {
  return (definition?.stepTemplate?.steps || [])
    .map((step, index) => ({
      id: String(step.id || `step-${index + 1}`),
      title: String(step.title || `Steg ${index + 1}`).trim(),
      nextAction: String(step.nextAction || "Fortsätt arbetet").trim(),
      checkpoint: String(step.checkpoint || "manual"),
      required: step.required !== false,
      active: step.active !== false,
      sortOrder: Number.isFinite(Number(step.sortOrder)) ? Number(step.sortOrder) : index
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function isGuidedActivityTemplate(definition) {
  return definition?.activityMode === "guided" && normalizedTemplateSteps(definition).some((step) => step.active);
}

export function initializeGuidedActivityState(definition, { actorId = "system", at = new Date().toISOString() } = {}) {
  if (!isGuidedActivityTemplate(definition)) return null;
  return {
    templateId: definition.id,
    templateVersion: Number(definition.version || 1),
    stepTemplateVersion: Number(definition.stepTemplate?.version || 1),
    steps: normalizedTemplateSteps(definition).filter((step) => step.active).map((step) => ({
      id: step.id,
      title: step.title,
      nextAction: step.nextAction,
      checkpoint: step.checkpoint,
      required: step.required,
      status: "not_started",
      reason: "",
      updatedAt: at,
      updatedBy: actorId,
      completedAt: null,
      completedBy: null
    }))
  };
}

export function guidedActivityState(activity, definition) {
  if (activity?.guidedState?.steps?.length) return activity.guidedState;
  return initializeGuidedActivityState(definition, {
    actorId: activity?.createdBy || "system",
    at: activity?.createdAt || new Date().toISOString()
  });
}

export function guidedActivityProgress(activity, definition) {
  const state = guidedActivityState(activity, definition);
  if (!state) return null;
  const completedStatuses = new Set(["complete", "not_applicable"]);
  const steps = state.steps || [];
  const currentIndex = steps.findIndex((step) => !completedStatuses.has(step.status));
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;
  const incompleteRequired = steps.filter((step) => step.required && step.status !== "complete");
  return {
    state,
    steps,
    totalCount: steps.length,
    completedCount: steps.filter((step) => completedStatuses.has(step.status)).length,
    currentIndex,
    currentStep,
    nextAction: currentStep?.nextAction || "Registrera aktivitetens slutresultat",
    canComplete: incompleteRequired.length === 0,
    incompleteRequired
  };
}

export function guidedActivityStatus(activity, definition) {
  if (["completed", "not_applicable"].includes(activity?.status)) return activity.status;
  const progress = guidedActivityProgress(activity, definition);
  if (!progress) return activity?.status || "not_started";
  if (progress.steps.some((step) => step.status === "blocked")) return "waiting";
  if (progress.steps.some((step) => step.status !== "not_started")) return "in_progress";
  return "not_started";
}

export function updateGuidedActivityStep(activity, definition, {
  stepId,
  status,
  reason = "",
  actorId,
  at = new Date().toISOString()
}) {
  if (!GUIDED_STEP_STATUSES.has(status)) throw new Error("Ogiltig stegstatus.");
  const state = guidedActivityState(activity, definition);
  const step = state?.steps?.find((item) => item.id === stepId);
  if (!step) throw new Error("Aktivitetssteget finns inte.");
  if (status === "not_applicable" && step.required) throw new Error("Ett obligatoriskt steg kan inte hoppas över.");
  if (["blocked", "not_applicable"].includes(status) && !String(reason).trim()) {
    throw new Error(status === "blocked" ? "Ange varför steget är blockerat." : "Ange varför steget inte är aktuellt.");
  }
  const nextStep = {
    ...step,
    status,
    reason: ["blocked", "not_applicable"].includes(status) ? String(reason).trim() : "",
    updatedAt: at,
    updatedBy: actorId,
    completedAt: status === "complete" ? at : null,
    completedBy: status === "complete" ? actorId : null
  };
  const nextState = { ...state, steps: state.steps.map((item) => item.id === stepId ? nextStep : item) };
  const nextActivity = { ...activity, guidedState: nextState };
  return {
    activity: {
      ...nextActivity,
      status: guidedActivityStatus(nextActivity, definition),
      waitingForParty: status === "blocked" ? "external" : null,
      updatedAt: at,
      updatedBy: actorId,
      version: Number(activity.version || 1) + 1
    },
    step: nextStep
  };
}

function completeStep(step, actorId, at) {
  if (step.status === "complete") return step;
  return {
    ...step,
    status: "complete",
    reason: "",
    updatedAt: at,
    updatedBy: actorId,
    completedAt: at,
    completedBy: actorId
  };
}

export function synchronizeFirstMeetingSteps(activity, definition, meetings = []) {
  const state = guidedActivityState(activity, definition);
  if (!state || activity?.templateId !== "matchingFirstMeeting") return { activity, changedSteps: [] };
  const relevant = meetings
    .filter((meeting) => !meeting.supersededByMeetingId && meeting.activityId === activity.id)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || right.occurredAt || 0) - new Date(left.updatedAt || left.createdAt || left.occurredAt || 0));
  const booked = relevant.find((meeting) => ["scheduled", "completed"].includes(meeting.meetingStatus || meeting.status));
  const completed = relevant.find((meeting) => (meeting.meetingStatus || meeting.status) === "completed" && String(meeting.summary || "").trim());
  if (!booked && !completed) return { activity: { ...activity, guidedState: state }, changedSteps: [] };

  const completedCheckpoints = new Set();
  if (booked) ["prepared", "time_found", "meeting_scheduled"].forEach((checkpoint) => completedCheckpoints.add(checkpoint));
  if (completed) ["meeting_completed", "meeting_documented"].forEach((checkpoint) => completedCheckpoints.add(checkpoint));
  const evidence = completed || booked;
  const at = evidence.updatedAt || evidence.createdAt || evidence.occurredAt || new Date().toISOString();
  const actorId = evidence.updatedBy || evidence.createdBy || "system";
  const changedSteps = [];
  const steps = state.steps.map((step) => {
    if (!completedCheckpoints.has(step.checkpoint) || step.status === "complete") return step;
    const updated = completeStep(step, actorId, at);
    changedSteps.push(updated);
    return updated;
  });
  const nextState = { ...state, steps };
  const nextActivity = { ...activity, guidedState: nextState };
  return {
    activity: {
      ...nextActivity,
      status: guidedActivityStatus(nextActivity, definition),
      waitingForParty: null,
      updatedAt: changedSteps.length ? at : activity.updatedAt,
      updatedBy: changedSteps.length ? actorId : activity.updatedBy,
      version: Number(activity.version || 1) + (changedSteps.length ? 1 : 0)
    },
    changedSteps
  };
}
