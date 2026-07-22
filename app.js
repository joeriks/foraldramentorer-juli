const DB_NAME = "foraldramentorer";
const DB_VERSION = 3;
const STORE = "candidates";
const HANDLERS_STORE = "handlers";
const MEETINGS_STORE = "meetings";
const CURRENT_USER_ID = "handler-sara";

const STATUSES = [
  "Anmäld",
  "Kontrollerad",
  "Utbildning pågår",
  "Redo för intervju",
  "Godkänd/Certifierad"
];

const CHECKS = [
  ["identityVerified", "Identitet verifierad"],
  ["registryChecked", "Belastningsregister granskat"],
  ["referencesDone", "Referenser klara"],
  ["trainingDone", "E-learning klar"],
  ["quizDone", "Kunskapsavstämning klar"],
  ["interviewDone", "Intervju genomförd"]
];

const CHECK_LABELS = Object.fromEntries(CHECKS);

const NEXT_ACTIONS = [
  {
    key: "identityVerified",
    label: "Verifiera identitet",
    description: "Kontrollera personens identitet och markera kontrollen som klar.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "registryChecked",
    label: "Granska belastningsregister",
    description: "Granska registerutdraget och markera kontrollen som klar.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "referencesDone",
    label: "Slutför referenser",
    description: "Dokumentera att referenserna är färdiga.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "trainingDone",
    label: "Slutför e-learning",
    description: "Följ upp utbildningen och markera momentet som klart.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "quizDone",
    label: "Genomför kunskapsavstämning",
    description: "Genomför avstämningen och markera momentet som klart.",
    tabId: "mentor-checks-tab",
    buttonLabel: "Öppna kontroller"
  },
  {
    key: "interviewDone",
    label: "Genomför intervju",
    description: "Boka eller dokumentera intervjun innan ärendet går till beslut.",
    tabId: "mentor-interview-tab",
    buttonLabel: "Öppna intervju"
  }
];

const seedCandidates = [
  {
    name: "Anna Lind",
    area: "Centrum",
    languages: "Svenska, engelska",
    availability: "Vardagskvällar",
    coordinator: "Maja Ekström",
    status: "Utbildning pågår",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "",
    notes: "Varm och tydlig. Har lång erfarenhet från föreningsliv."
  },
  {
    name: "Bo Karlsson",
    area: "Väster",
    languages: "Svenska",
    availability: "Dagtid",
    coordinator: "Maja Ekström",
    status: "Redo för intervju",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: true,
      quizDone: true,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "Digitalt möte",
    notes: "Ska bokas för digital intervju."
  },
  {
    name: "Samira Haddad",
    area: "Öster",
    languages: "Svenska, arabiska",
    availability: "Helgförmiddagar",
    coordinator: "Jonas Berg",
    status: "Godkänd/Certifierad",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: true,
      quizDone: true,
      interviewDone: true
    },
    interviewDate: "2026-07-12T10:30",
    interviewMode: "Fysiskt möte",
    notes: "God förmåga att lyssna. Tydlig kring gränser och uppdragets roll."
  },
  {
    name: "Karin Nyström",
    area: "Norr",
    languages: "Svenska, finska",
    availability: "Tisdagar och torsdagar dagtid",
    coordinator: "Jonas Berg",
    status: "Anmäld",
    checks: {
      identityVerified: false,
      registryChecked: false,
      referencesDone: false,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "",
    notes: "Ny intresseanmälan. Behöver första kontakt och identitetskontroll."
  },
  {
    name: "Leif Andersson",
    area: "Söder",
    languages: "Svenska",
    availability: "Måndag kväll och lördag förmiddag",
    coordinator: "Maja Ekström",
    status: "Kontrollerad",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: false,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "",
    notes: "Registerutdrag granskat. Väntar på en referens."
  },
  {
    name: "Fatima El-Masri",
    area: "Centrum",
    languages: "Svenska, arabiska, engelska",
    availability: "Vardagskvällar",
    coordinator: "Sara Lind",
    status: "Utbildning pågår",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "Digitalt möte",
    notes: "Stark motivation. Har erfarenhet av föreningsarbete med nyanlända familjer."
  },
  {
    name: "Gunnar Pettersson",
    area: "Väster",
    languages: "Svenska, tyska",
    availability: "Dagtid vardagar",
    coordinator: "Sara Lind",
    status: "Redo för intervju",
    checks: {
      identityVerified: true,
      registryChecked: true,
      referencesDone: true,
      trainingDone: true,
      quizDone: true,
      interviewDone: false
    },
    interviewDate: "2026-07-20T13:00",
    interviewMode: "Fysiskt möte",
    notes: "Intervju bokad. Följ upp gränsdragning kring praktiska tjänster."
  },
  {
    name: "Mikael Holm",
    area: "Norr",
    languages: "Svenska, persiska",
    availability: "Helger",
    coordinator: "Jonas Berg",
    status: "Kontrollerad",
    checks: {
      identityVerified: true,
      registryChecked: false,
      referencesDone: true,
      trainingDone: false,
      quizDone: false,
      interviewDone: false
    },
    interviewDate: "",
    interviewMode: "",
    notes: "Referenser klara. Väntar på belastningsregister."
  }
];

const seedCandidates10 = [
  ...seedCandidates,
  {
    ...seedCandidates[3],
    name: "Elin Berg",
    area: "Söder",
    languages: "Svenska, engelska",
    availability: "Kvällstid vardagar",
    coordinator: "Sara Lind"
  },
  {
    ...seedCandidates[6],
    name: "Omar Rahimi",
    area: "Öster",
    languages: "Svenska, dari",
    availability: "Dagtid och helger",
    coordinator: "Maja Ekström"
  }
];

const exampleFirstNames = [
  "Amina", "Anders", "Aya", "Camilla", "Daniel", "Elin", "Farah", "Gunnar", "Helena", "Isak",
  "Jasmin", "Johan", "Karin", "Leila", "Magnus", "Maria", "Nadia", "Omar", "Per", "Rania",
  "Samir", "Sara", "Thomas", "Yasmin", "Åsa"
];

const exampleLastNames = [
  "Andersson", "Berg", "Dahl", "Ekström", "Haddad", "Holm", "Lind", "Nilsson", "Rahimi", "Svensson"
];

const seedHandlers = [
  { id: "handler-maja", userId: "FMU-1001", name: "Maja Ekström", email: "maja.ekstrom@kommun.example", role: "Handläggare", active: true },
  { id: "handler-jonas", userId: "FMU-1002", name: "Jonas Berg", email: "jonas.berg@kommun.example", role: "Handläggare", active: true },
  { id: "handler-sara", userId: "FMU-1003", name: "Sara Lind", email: "sara.lind@kommun.example", role: "Samordnare", active: true }
];

let db;
let candidates = [];
let handlers = [];
let meetings = [];
let selectedId = null;
let searchTerm = "";
let statusFilter = "";
let candidateModal;
let currentView = "dashboard";
let renderedDetailId = null;
let workQueueOnly = false;
let pendingNextActionId = null;
let handlerSearchTerm = "";
let handlerStatusFilter = "";
let handlerModal;
let selectedHandlerId = null;
let selectedMeetingId = null;
let confirmActionModal;
let pendingConfirmation = null;
let identityEditMode = false;

const els = {
  pageTitle: document.querySelector("#pageTitle"),
  breadcrumb: document.querySelector("#breadcrumb"),
  currentUserInitials: document.querySelector("#currentUserInitials"),
  currentUserName: document.querySelector("#currentUserName"),
  currentUserRole: document.querySelector("#currentUserRole"),
  navDashboard: document.querySelector("#navDashboard"),
  navCandidates: document.querySelector("#navCandidates"),
  navAdministration: document.querySelector("#navAdministration"),
  dashboardView: document.querySelector("#dashboardView"),
  candidatesView: document.querySelector("#candidatesView"),
  detailView: document.querySelector("#detailView"),
  administrationView: document.querySelector("#administrationView"),
  handlerDetailView: document.querySelector("#handlerDetailView"),
  handlerDetailEmpty: document.querySelector("#handlerDetailEmpty"),
  handlerDetail: document.querySelector("#handlerDetail"),
  totalCount: document.querySelector("#totalCount"),
  pipelineGrid: document.querySelector("#pipelineBoard .pipeline-grid"),
  actionTableBody: document.querySelector("#actionTableBody"),
  actionQueueSummary: document.querySelector("#actionQueueSummary"),
  openActionQueueButton: document.querySelector("#openActionQueueButton"),
  dashboardMentorRegisterLink: document.querySelector("#dashboardMentorRegisterLink"),
  seedButton: document.querySelector("#seedButton"),
  exampleDataMenu: document.querySelector("#exampleDataMenu"),
  resetButton: document.querySelector("#resetButton"),
  newCaseButton: document.querySelector("#newCaseButton"),
  dashboardNewCaseButton: document.querySelector("#dashboardNewCaseButton"),
  cancelNewCaseButton: document.querySelector("#cancelNewCaseButton"),
  candidateForm: document.querySelector("#candidateForm"),
  candidateTableBody: document.querySelector("#candidateTableBody"),
  mentorListTitle: document.querySelector("#mentorListTitle"),
  mentorListCount: document.querySelector("#mentorListCount"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  handlerListCount: document.querySelector("#handlerListCount"),
  handlerSearchInput: document.querySelector("#handlerSearchInput"),
  handlerStatusFilter: document.querySelector("#handlerStatusFilter"),
  handlerTableBody: document.querySelector("#handlerTableBody"),
  newHandlerButton: document.querySelector("#newHandlerButton"),
  handlerForm: document.querySelector("#handlerForm"),
  handlerModalTitle: document.querySelector("#handlerModalTitle"),
  handlerIdInput: document.querySelector("#handlerIdInput"),
  handlerNameInput: document.querySelector("#handlerNameInput"),
  handlerEmailInput: document.querySelector("#handlerEmailInput"),
  handlerRoleInput: document.querySelector("#handlerRoleInput"),
  handlerActiveInput: document.querySelector("#handlerActiveInput"),
  selectedHandlerName: document.querySelector("#selectedHandlerName"),
  selectedHandlerUserId: document.querySelector("#selectedHandlerUserId"),
  selectedHandlerStatus: document.querySelector("#selectedHandlerStatus"),
  selectedHandlerRoleMeta: document.querySelector("#selectedHandlerRoleMeta"),
  selectedHandlerCreatedMeta: document.querySelector("#selectedHandlerCreatedMeta"),
  selectedHandlerUpdatedMeta: document.querySelector("#selectedHandlerUpdatedMeta"),
  editHandlerButton: document.querySelector("#editHandlerButton"),
  handlerEditActions: document.querySelector("#handlerEditActions"),
  cancelHandlerEditButton: document.querySelector("#cancelHandlerEditButton"),
  toggleSelectedHandlerButton: document.querySelector("#toggleSelectedHandlerButton"),
  handlerReadView: document.querySelector("#handlerReadView"),
  handlerEditForm: document.querySelector("#handlerEditForm"),
  handlerNameFact: document.querySelector("#handlerNameFact"),
  handlerEmailFact: document.querySelector("#handlerEmailFact"),
  handlerRoleFact: document.querySelector("#handlerRoleFact"),
  handlerStatusFact: document.querySelector("#handlerStatusFact"),
  handlerAssignedFact: document.querySelector("#handlerAssignedFact"),
  handlerAssignedEditFact: document.querySelector("#handlerAssignedEditFact"),
  editHandlerNameInput: document.querySelector("#editHandlerNameInput"),
  editHandlerEmailInput: document.querySelector("#editHandlerEmailInput"),
  editHandlerRoleInput: document.querySelector("#editHandlerRoleInput"),
  editHandlerActiveInput: document.querySelector("#editHandlerActiveInput"),
  detailEmpty: document.querySelector("#detailEmpty"),
  candidateDetail: document.querySelector("#candidateDetail"),
  nextActionBar: document.querySelector("#nextActionBar"),
  nextActionTitle: document.querySelector("#nextActionTitle"),
  nextActionDescription: document.querySelector("#nextActionDescription"),
  openNextActionButton: document.querySelector("#openNextActionButton"),
  selectedCaseId: document.querySelector("#selectedCaseId"),
  selectedStatus: document.querySelector("#selectedStatus"),
  selectedName: document.querySelector("#selectedName"),
  selectedCoordinatorMeta: document.querySelector("#selectedCoordinatorMeta"),
  selectedCreatedMeta: document.querySelector("#selectedCreatedMeta"),
  selectedUpdatedMeta: document.querySelector("#selectedUpdatedMeta"),
  recordMoreActions: document.querySelector("#recordMoreActions"),
  editPersonButton: document.querySelector("#editPersonButton"),
  personEditActions: document.querySelector("#personEditActions"),
  personReadView: document.querySelector("#personReadView"),
  personEditForm: document.querySelector("#personEditForm"),
  savePersonEditButton: document.querySelector("#savePersonEditButton"),
  cancelPersonEditButton: document.querySelector("#cancelPersonEditButton"),
  editNameInput: document.querySelector("#editNameInput"),
  editPersonalNumberInput: document.querySelector("#editPersonalNumberInput"),
  editAreaInput: document.querySelector("#editAreaInput"),
  editLanguagesInput: document.querySelector("#editLanguagesInput"),
  editAvailabilityInput: document.querySelector("#editAvailabilityInput"),
  statusSelect: document.querySelector("#statusSelect"),
  coordinatorInput: document.querySelector("#coordinatorInput"),
  coordinatorFieldRow: document.querySelector("#coordinatorFieldRow"),
  nameFact: document.querySelector("#nameFact"),
  personalNumberFact: document.querySelector("#personalNumberFact"),
  languageFact: document.querySelector("#languageFact"),
  availabilityFact: document.querySelector("#availabilityFact"),
  areaFact: document.querySelector("#areaFact"),
  statusFact: document.querySelector("#statusFact"),
  coordinatorFact: document.querySelector("#coordinatorFact"),
  identityMethodFact: document.querySelector("#identityMethodFact"),
  identityMethodEditFact: document.querySelector("#identityMethodEditFact"),
  nextStepFact: document.querySelector("#nextStepFact"),
  nextStepEditFact: document.querySelector("#nextStepEditFact"),
  checksTabCount: document.querySelector("#checksTabCount"),
  meetingsTabCount: document.querySelector("#meetingsTabCount"),
  logTabCount: document.querySelector("#logTabCount"),
  checklist: document.querySelector("#checklist"),
  identityVerificationPanel: document.querySelector("#identityVerificationPanel"),
  identityReadView: document.querySelector("#identityReadView"),
  identityEditView: document.querySelector("#identityEditView"),
  identityPersonalNumberFact: document.querySelector("#identityPersonalNumberFact"),
  identityMethodCheckFact: document.querySelector("#identityMethodCheckFact"),
  identityPersonalNumberInput: document.querySelector("#identityPersonalNumberInput"),
  identityMethodSelect: document.querySelector("#identityMethodSelect"),
  identityVerificationMeta: document.querySelector("#identityVerificationMeta"),
  identityVerifiedAtFact: document.querySelector("#identityVerifiedAtFact"),
  identityVerifiedByFact: document.querySelector("#identityVerifiedByFact"),
  identityNoteFact: document.querySelector("#identityNoteFact"),
  editIdentityVerificationButton: document.querySelector("#editIdentityVerificationButton"),
  cancelIdentityVerificationButton: document.querySelector("#cancelIdentityVerificationButton"),
  saveIdentityVerificationButton: document.querySelector("#saveIdentityVerificationButton"),
  interviewDateInput: document.querySelector("#interviewDateInput"),
  interviewModeInput: document.querySelector("#interviewModeInput"),
  interviewCompletion: document.querySelector("#interviewCompletion"),
  interviewDoneInput: document.querySelector("#interviewDoneInput"),
  interviewDoneMeta: document.querySelector("#interviewDoneMeta"),
  newMeetingButton: document.querySelector("#newMeetingButton"),
  meetingForm: document.querySelector("#meetingForm"),
  meetingFormTitle: document.querySelector("#meetingFormTitle"),
  cancelMeetingButton: document.querySelector("#cancelMeetingButton"),
  deleteMeetingButton: document.querySelector("#deleteMeetingButton"),
  meetingTypeInput: document.querySelector("#meetingTypeInput"),
  meetingDateInput: document.querySelector("#meetingDateInput"),
  meetingModeInput: document.querySelector("#meetingModeInput"),
  meetingSummaryInput: document.querySelector("#meetingSummaryInput"),
  meetingNextStepInput: document.querySelector("#meetingNextStepInput"),
  meetingsEmpty: document.querySelector("#meetingsEmpty"),
  meetingsTableWrap: document.querySelector("#meetingsTableWrap"),
  meetingsTableBody: document.querySelector("#meetingsTableBody"),
  decisionHint: document.querySelector("#decisionHint"),
  approveButton: document.querySelector("#approveButton"),
  deleteButton: document.querySelector("#deleteButton"),
  auditLog: document.querySelector("#auditLog"),
  saveStatus: document.querySelector("#saveStatus"),
  feedbackToast: document.querySelector("#feedbackToast"),
  feedbackToastBody: document.querySelector("#feedbackToastBody"),
  confirmActionModal: document.querySelector("#confirmActionModal"),
  confirmActionEyebrow: document.querySelector("#confirmActionEyebrow"),
  confirmActionTitle: document.querySelector("#confirmActionTitle"),
  confirmActionBody: document.querySelector("#confirmActionBody"),
  confirmActionMentor: document.querySelector("#confirmActionMentor"),
  confirmActionActor: document.querySelector("#confirmActionActor"),
  confirmActionTime: document.querySelector("#confirmActionTime"),
  confirmActionNote: document.querySelector("#confirmActionNote"),
  confirmActionButton: document.querySelector("#confirmActionButton")
};

function markSaved() {
  const time = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
  els.saveStatus.textContent = `Senast sparad ${time}`;
}

function showFeedback(message) {
  els.feedbackToastBody.textContent = message;
  bootstrap.Toast.getOrCreateInstance(els.feedbackToast, { delay: 3200 }).show();
}

function confirmAction({ eyebrow = "Bekräfta ändring", title, body, mentorName, confirmLabel = "Bekräfta", danger = false }) {
  if (!confirmActionModal) return Promise.resolve({ confirmed: window.confirm(body), note: "" });
  els.confirmActionEyebrow.textContent = eyebrow;
  els.confirmActionTitle.textContent = title;
  els.confirmActionBody.textContent = body;
  els.confirmActionMentor.textContent = mentorName || "Ej angivet";
  els.confirmActionActor.textContent = currentUserName();
  els.confirmActionTime.textContent = formatDateTime(new Date().toISOString());
  els.confirmActionNote.value = "";
  els.confirmActionButton.textContent = confirmLabel;
  els.confirmActionButton.classList.toggle("btn-danger", danger);
  els.confirmActionButton.classList.toggle("btn-primary", !danger);
  confirmActionModal.show();

  return new Promise((resolve) => {
    pendingConfirmation = resolve;
  });
}

function resolveConfirmation(value) {
  if (!pendingConfirmation) return;
  const resolve = pendingConfirmation;
  pendingConfirmation = null;
  resolve({ confirmed: value, note: value ? els.confirmActionNote.value.trim() : "" });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const nextDb = request.result;
      if (!nextDb.objectStoreNames.contains(STORE)) {
        nextDb.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!nextDb.objectStoreNames.contains(HANDLERS_STORE)) {
        nextDb.createObjectStore(HANDLERS_STORE, { keyPath: "id" });
      }
      if (!nextDb.objectStoreNames.contains(MEETINGS_STORE)) {
        const meetingStore = nextDb.createObjectStore(MEETINGS_STORE, { keyPath: "id" });
        meetingStore.createIndex("mentorId", "mentorId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function handlerTx(mode = "readonly") {
  return db.transaction(HANDLERS_STORE, mode).objectStore(HANDLERS_STORE);
}

function meetingTx(mode = "readonly") {
  return db.transaction(MEETINGS_STORE, mode).objectStore(MEETINGS_STORE);
}

function getAllCandidates() {
  return new Promise((resolve, reject) => {
    const request = tx().getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveCandidate(candidate) {
  return new Promise((resolve, reject) => {
    const request = tx("readwrite").put(candidate);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteCandidate(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE, MEETINGS_STORE], "readwrite");
    transaction.objectStore(STORE).delete(id);
    const meetingIndex = transaction.objectStore(MEETINGS_STORE).index("mentorId");
    const cursorRequest = meetingIndex.openCursor(IDBKeyRange.only(id));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function clearCandidates() {
  return new Promise((resolve, reject) => {
    const request = tx("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllHandlers() {
  return new Promise((resolve, reject) => {
    const request = handlerTx().getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveHandler(handler) {
  return new Promise((resolve, reject) => {
    const request = handlerTx("readwrite").put(handler);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearHandlers() {
  return new Promise((resolve, reject) => {
    const request = handlerTx("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllMeetings() {
  return new Promise((resolve, reject) => {
    const request = meetingTx().getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveMeeting(meeting) {
  return new Promise((resolve, reject) => {
    const request = meetingTx("readwrite").put(meeting);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteMeeting(id) {
  return new Promise((resolve, reject) => {
    const request = meetingTx("readwrite").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearMeetings() {
  return new Promise((resolve, reject) => {
    const request = meetingTx("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function ensureDefaultHandlers() {
  const existing = await getAllHandlers();
  if (existing.length) return;
  const now = new Date().toISOString();
  await Promise.all(seedHandlers.map((handler) => saveHandler({
    ...handler,
    createdAt: now,
    updatedAt: now
  })));
}

function replaceCandidates(nextCandidates) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    store.clear();
    for (const candidate of nextCandidates) {
      store.put(candidate);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function exampleTemplates(count) {
  if (count === 1) return seedCandidates.slice(3, 4);
  if (count === 10) return seedCandidates10;

  return Array.from({ length: count }, (_, index) => {
    const template = seedCandidates[index % seedCandidates.length];
    const firstName = exampleFirstNames[index % exampleFirstNames.length];
    const lastName = exampleLastNames[Math.floor(index / exampleFirstNames.length) % exampleLastNames.length];
    return {
      ...template,
      name: `${firstName} ${lastName}`
    };
  });
}

function buildExampleDataset(count) {
  const now = new Date().toISOString();
  return exampleTemplates(count).map((candidate, index) => {
    const id = crypto.randomUUID();
    const identityVerified = Boolean(candidate.checks?.identityVerified);
    const coordinator = index % 2 === 0 ? "" : candidate.coordinator;
    const checkMeta = buildCheckMeta(candidate.checks, {
      checkedAt: now,
      checkedBy: coordinator || "System"
    });
    return {
      ...candidate,
      checks: { ...candidate.checks },
      checkMeta,
      id,
      coordinatorId: "",
      coordinator,
      personalNumber: makeExamplePersonalNumber(index),
      identityMethod: identityVerified ? (index % 2 === 0 ? "bankid" : "physical_id") : "",
      identityVerifiedAt: identityVerified ? now : "",
      identityVerifiedBy: identityVerified ? "Sara Lind" : "",
      exampleData: true,
      exampleDataVersion: 3,
      exampleDatasetSize: count,
      caseNumber: makeCaseNumber(id),
      history: [
        { at: now, text: "Ärende skapat som exempeldata", actor: "System" },
        { at: now, text: `Status satt till ${candidate.status}`, actor: "System" }
      ],
      createdAt: now,
      updatedAt: now
    };
  });
}

async function refresh() {
  handlers = await getAllHandlers();
  await migrateDefaultHandlerRecords();
  handlers.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  candidates = await getAllCandidates();
  candidates = candidates.map(normalizeCandidate);
  meetings = await getAllMeetings();
  await migrateSingleExampleMentor();
  await migrateExampleCoordinatorDistribution();
  await migrateCoordinatorReferences();
  await ensureUniqueCaseNumbers();
  await migrateLegacyMeetingNotes();
  meetings = await getAllMeetings();
  meetings.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  candidates.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.name.localeCompare(b.name, "sv"));
  renderAll();
}

async function migrateLegacyMeetingNotes() {
  const existingIds = new Set(meetings.map((meeting) => meeting.id));
  const legacyCandidates = candidates.filter((candidate) => candidate.notes);
  const legacyMeetings = legacyCandidates
    .filter((candidate) => !existingIds.has(`legacy-${candidate.id}`))
    .map((candidate) => ({
      id: `legacy-${candidate.id}`,
      mentorId: candidate.id,
      type: candidate.interviewDate || candidate.checks?.interviewDone ? "Certifieringsintervju" : "Övrig kontakt",
      occurredAt: candidate.interviewDate || candidate.createdAt,
      mode: candidate.interviewMode || "Ej angivet",
      summary: candidate.notes,
      nextStep: "",
      createdBy: candidate.coordinator || "System",
      createdAt: candidate.updatedAt || candidate.createdAt,
      updatedAt: candidate.updatedAt || candidate.createdAt
    }));
  await Promise.all([
    ...legacyMeetings.map(saveMeeting),
    ...legacyCandidates.map((candidate) => {
      candidate.notes = "";
      return saveCandidate(candidate);
    })
  ]);
}

async function migrateSingleExampleMentor() {
  if (candidates.length !== 1) return;
  const candidate = candidates[0];
  if (candidate.exampleData !== true || candidate.exampleDatasetSize !== 1 || candidate.name !== "Anna Lind") return;
  const template = seedCandidates[3];
  const now = new Date().toISOString();
  Object.assign(candidate, {
    ...template,
    id: candidate.id,
    caseNumber: candidate.caseNumber,
    personalNumber: candidate.personalNumber,
    coordinatorId: "",
    coordinator: "",
    identityMethod: "",
    identityVerifiedAt: "",
    identityVerifiedBy: "",
    exampleData: true,
    exampleDataVersion: 3,
    exampleDatasetSize: 1,
    createdAt: candidate.createdAt,
    updatedAt: now,
    history: [...(candidate.history || []), { at: now, text: "Exempelpost uppdaterad till Karin Nyström", actor: "System" }]
  });
  await saveCandidate(candidate);
}

async function migrateExampleCoordinatorDistribution() {
  const legacyExamples = candidates.filter((candidate) => candidate.exampleData === true && !candidate.exampleDataVersion);
  if (!legacyExamples.length) return;
  await Promise.all(legacyExamples.map((candidate, index) => {
    Object.assign(candidate, {
      ...(index % 2 === 0 ? { coordinatorId: "", coordinator: "" } : {}),
      exampleDataVersion: 2
    });
    return saveCandidate(candidate);
  }));
}

async function migrateDefaultHandlerRecords() {
  const legacyNames = {
    "handler-maja": "Maja",
    "handler-jonas": "Jonas",
    "handler-sara": "Sara"
  };
  const usedUserIds = new Set();
  const reservedUserIds = new Set(handlers
    .map((handler) => String(handler.userId || "").trim().toUpperCase())
    .filter(Boolean));
  let nextUserId = 1004;
  const allocateUserId = () => {
    let value;
    do {
      value = `FMU-${nextUserId}`;
      nextUserId += 1;
    } while (usedUserIds.has(value) || reservedUserIds.has(value));
    return value;
  };
  const updates = [];
  const orderedHandlers = [...handlers].sort((a, b) => {
    const aIsDefault = seedHandlers.some((item) => item.id === a.id);
    const bIsDefault = seedHandlers.some((item) => item.id === b.id);
    return Number(bIsDefault) - Number(aIsDefault);
  });
  for (const handler of orderedHandlers) {
    const template = seedHandlers.find((item) => item.id === handler.id);
    const legacyEmail = template ? `${legacyNames[handler.id]?.toLowerCase()}@kommun.example` : "";
    const name = template && handler.name === legacyNames[handler.id] ? template.name : handler.name;
    const email = template && handler.email === legacyEmail ? template.email : handler.email;
    const requestedUserId = template?.userId || String(handler.userId || "").trim().toUpperCase();
    const userId = requestedUserId && !usedUserIds.has(requestedUserId) ? requestedUserId : allocateUserId();
    usedUserIds.add(userId);
    if (name === handler.name && email === handler.email && userId === handler.userId) continue;
    Object.assign(handler, { name, email, userId, updatedAt: new Date().toISOString() });
    updates.push(saveHandler(handler));
  }
  await Promise.all(updates);
}

function renderAll() {
  applyRoute();
  renderCurrentUser();
  renderSummary();
  renderPipeline();
  renderDashboard();
  renderTable();
  renderDetail();
  renderHandlers();
  renderHandlerDetail();
}

function currentUser() {
  return handlers.find((handler) => handler.id === CURRENT_USER_ID)
    || { id: CURRENT_USER_ID, userId: "FMU-1003", name: "Sara Lind", role: "Samordnare" };
}

function currentUserName() {
  return currentUser().name;
}

function buildCheckMeta(checks = {}, fallback = {}) {
  return Object.fromEntries(CHECKS.map(([key]) => {
    const checked = Boolean(checks?.[key]);
    return [key, checked
      ? {
        checkedAt: fallback.checkedAt || new Date().toISOString(),
        checkedBy: fallback.checkedBy || "System",
        note: fallback.note || ""
      }
      : { checkedAt: "", checkedBy: "", note: "" }];
  }));
}

function normalizeCheckMeta(candidate) {
  const fallback = {
    checkedAt: candidate.updatedAt || candidate.createdAt || new Date().toISOString(),
    checkedBy: candidate.coordinator || "System"
  };
  const existing = candidate.checkMeta || {};
  return Object.fromEntries(CHECKS.map(([key]) => {
    const checked = Boolean(candidate.checks?.[key]);
    const meta = existing[key] || {};
    if (!checked) return [key, { checkedAt: "", checkedBy: "", note: "" }];
    if (key === "identityVerified") {
      return [key, {
        checkedAt: candidate.identityVerifiedAt || meta.checkedAt || fallback.checkedAt,
        checkedBy: candidate.identityVerifiedBy || meta.checkedBy || fallback.checkedBy,
        note: meta.note || ""
      }];
    }
    return [key, {
      checkedAt: meta.checkedAt || fallback.checkedAt,
      checkedBy: meta.checkedBy || fallback.checkedBy,
      note: meta.note || ""
    }];
  }));
}

function userInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("sv-SE") || "?";
}

function renderCurrentUser() {
  const user = currentUser();
  els.currentUserName.textContent = user.name;
  els.currentUserRole.textContent = user.active === false ? `${user.role} · Inaktiv` : user.role;
  els.currentUserInitials.textContent = userInitials(user.name);
}

async function migrateCoordinatorReferences() {
  const fullNames = {
    Maja: "Maja Ekström",
    Jonas: "Jonas Berg",
    Sara: "Sara Lind"
  };
  const changed = [];
  for (const candidate of candidates) {
    const handler = candidate.coordinatorId
      ? handlers.find((item) => item.id === candidate.coordinatorId)
      : handlers.find((item) => item.name === candidate.coordinator
        || item.name.split(/\s+/)[0] === candidate.coordinator);
    const coordinatorChanged = Boolean(handler
      && (candidate.coordinatorId !== handler.id || candidate.coordinator !== handler.name));
    const identityVerifiedBy = fullNames[candidate.identityVerifiedBy] || candidate.identityVerifiedBy;
    const history = (candidate.history || []).map((item) => ({
      ...item,
      actor: fullNames[item.actor] || item.actor
    }));
    const historyChanged = history.some((item, index) => item.actor !== candidate.history?.[index]?.actor);
    const identityChanged = identityVerifiedBy !== candidate.identityVerifiedBy;
    if (!coordinatorChanged && !historyChanged && !identityChanged) continue;
    Object.assign(candidate, {
      ...(handler ? { coordinatorId: handler.id, coordinator: handler.name } : {}),
      identityVerifiedBy,
      history
    });
    changed.push(saveCandidate(candidate));
  }
  await Promise.all(changed);
}

function normalizeCandidate(candidate, index = 0) {
  const personalNumber = candidate.personalNumber || (candidate.exampleData ? makeExamplePersonalNumber(index) : "");
  const identityMethod = candidate.identityMethod
    || (candidate.exampleData && candidate.checks?.identityVerified ? (index % 2 === 0 ? "bankid" : "physical_id") : "");
  const identityVerified = Boolean(candidate.checks?.identityVerified && personalNumber && identityMethod);
  const normalized = {
    ...candidate,
    checks: {
      ...(candidate.checks || {}),
      identityVerified
    },
    personalNumber,
    identityMethod,
    identityVerifiedAt: identityVerified ? candidate.identityVerifiedAt || candidate.updatedAt || candidate.createdAt : "",
    identityVerifiedBy: identityVerified ? candidate.identityVerifiedBy || candidate.coordinator || "System" : ""
  };
  return {
    ...normalized,
    personalNumber,
    identityMethod,
    checkMeta: normalizeCheckMeta(normalized),
    caseNumber: candidate.caseNumber || makeCaseNumber(candidate.id || candidate.createdAt),
    coordinatorId: candidate.coordinatorId || "",
    coordinator: candidate.coordinator || "",
    interviewMode: candidate.interviewMode || "",
    history: candidate.history || [
      {
        at: candidate.createdAt || new Date().toISOString(),
        text: "Ärende skapat"
      }
    ]
  };
}

async function ensureUniqueCaseNumbers() {
  const seen = new Set();
  let changed = false;

  for (const candidate of candidates) {
    if (!candidate.caseNumber || seen.has(candidate.caseNumber)) {
      candidate.caseNumber = makeCaseNumber(candidate.id || candidate.createdAt, seen);
      candidate.updatedAt = new Date().toISOString();
      candidate.history = [
        ...(candidate.history || []),
        { at: candidate.updatedAt, text: `Ärendenummer satt till ${candidate.caseNumber}` }
      ];
      changed = true;
    }
    seen.add(candidate.caseNumber);
  }

  if (changed) {
    await Promise.all(candidates.map(saveCandidate));
  }
}

function selectedCandidate() {
  return candidates.find((candidate) => candidate.id === selectedId);
}

function isCreatingMentor() {
  return currentView === "mentor" && selectedId === "new";
}

function filteredCandidates() {
  const term = searchTerm.trim().toLowerCase();
  return candidates.filter((candidate) => {
    const statusMatches = !statusFilter || candidate.status === statusFilter;
    const queueMatches = !workQueueOnly || candidateNeedsAction(candidate);
    const text = [
      candidate.caseNumber,
      candidate.name,
      candidate.personalNumber,
      candidate.area,
      candidate.languages,
      candidate.availability,
      candidate.coordinator,
      candidate.status
    ].join(" ").toLowerCase();
    return queueMatches && statusMatches && (!term || text.includes(term));
  });
}

function candidatesNeedingAction() {
  return candidates.filter(candidateNeedsAction);
}

function candidateNeedsAction(candidate) {
  return candidate.status !== "Godkänd/Certifierad" || !candidate.coordinatorId;
}

function isComplete(candidate) {
  return Boolean(
    candidate.coordinatorId
    && candidate.interviewDate
    && candidate.interviewMode
    && CHECKS.every(([key]) => candidate.checks?.[key])
  );
}

function isBlocked(candidate) {
  return !candidate.checks?.identityVerified || !candidate.checks?.registryChecked || !candidate.checks?.referencesDone;
}

function statusFromChecks(checks) {
  if (!checks?.identityVerified) return "Anmäld";
  if (!checks.registryChecked || !checks.referencesDone) return "Kontrollerad";
  if (!checks.trainingDone || !checks.quizDone) return "Utbildning pågår";
  return "Redo för intervju";
}

function nextStepText(candidate) {
  return nextActionFor(candidate).label;
}

function nextActionFor(candidate) {
  if (!candidate.coordinatorId) {
    return {
      key: "coordinatorAssigned",
      label: "Tilldela handläggare",
      description: "Utse en ansvarig handläggare innan ärendet går vidare i introduktionsflödet.",
      tabId: "mentor-base-tab",
      buttonLabel: "Tilldela handläggare"
    };
  }

  if (candidate.status === "Godkänd/Certifierad") {
    return {
      key: null,
      label: "Ingen åtgärd",
      description: "Mentorn är certifierad och tillgänglig för matchning.",
      tabId: null,
      buttonLabel: ""
    };
  }

  const next = NEXT_ACTIONS.find((action) => !candidate.checks?.[action.key]);
  return next || {
    key: "decision",
    label: "Fatta beslut",
    description: "Alla krav är klara. Granska underlaget och certifiera mentorn.",
    tabId: "mentor-decision-tab",
    buttonLabel: "Öppna beslut"
  };
}

function parseRoute() {
  const hash = window.location.hash || "#/dashboard";
  const [, view, id] = hash.match(/^#\/([^/]+)\/?(.+)?$/) || [];
  return {
    view: normalizeRouteView(view || "dashboard"),
    id: id || null
  };
}

function normalizeRouteView(view) {
  if (view === "candidates") return "mentors";
  if (view === "candidate") return "mentor";
  return view;
}

function applyRoute() {
  const route = parseRoute();
  currentView = ["dashboard", "mentors", "mentor", "administration", "handler"].includes(route.view) ? route.view : "dashboard";
  selectedId = currentView === "mentor" ? route.id : selectedId;
  selectedHandlerId = currentView === "handler" ? route.id : selectedHandlerId;
  workQueueOnly = currentView === "mentors" && route.id === "action";

  els.dashboardView.hidden = currentView !== "dashboard";
  els.candidatesView.hidden = currentView !== "mentors";
  els.detailView.hidden = currentView !== "mentor";
  els.administrationView.hidden = currentView !== "administration";
  els.handlerDetailView.hidden = currentView !== "handler";

  els.navDashboard.classList.toggle("active", currentView === "dashboard");
  els.navCandidates.classList.toggle("active", currentView === "mentors" || currentView === "mentor");
  els.navAdministration.classList.toggle("active", currentView === "administration" || currentView === "handler");

  if (currentView === "dashboard") {
    els.pageTitle.textContent = "Dashboard";
    els.breadcrumb.textContent = "Start / Dashboard";
  } else if (currentView === "mentors") {
    els.pageTitle.textContent = workQueueOnly ? "Arbetskö" : "Mentorregister";
    els.breadcrumb.textContent = workQueueOnly ? "Start / Onboarding / Arbetskö" : "Start / Onboarding / Mentorregister";
    els.mentorListTitle.textContent = workQueueOnly ? "Arbetskö" : "Mentorregister";
  } else if (currentView === "mentor") {
    const isNewMentor = route.id === "new";
    els.pageTitle.textContent = isNewMentor ? "Registrera mentor" : "Mentorkort";
    els.breadcrumb.textContent = isNewMentor ? "Start / Onboarding / Registrera mentor" : "Start / Onboarding / Mentorkort";
  } else if (currentView === "administration") {
    els.pageTitle.textContent = "Administration";
    els.breadcrumb.textContent = "Start / Administration / Handläggare";
  } else {
    els.pageTitle.textContent = "Handläggarkort";
    els.breadcrumb.textContent = "Start / Administration / Handläggarkort";
  }
}

function navigateToCandidate(id) {
  window.location.hash = `#/mentor/${id}`;
}

function navigateToNewCandidate() {
  window.location.hash = "#/mentor/new";
}

function navigateToHandler(id) {
  window.location.hash = `#/handler/${id}`;
}

function navigateTo(hash) {
  if (window.location.hash === hash) {
    renderAll();
    return;
  }
  window.location.hash = hash;
}

function navigateToCandidateListWithStatus(status) {
  statusFilter = status;
  els.statusFilter.value = status;
  navigateTo("#/mentors");
  renderTable();
}

function resetMentorFilters() {
  searchTerm = "";
  statusFilter = "";
  els.searchInput.value = "";
  els.statusFilter.value = "";
}

function renderSummary() {
  els.totalCount.textContent = candidates.length;
  renderSeedButtonState();
}

function statusCount(status) {
  return candidates.filter((candidate) => candidate.status === status).length;
}

function renderPipeline() {
  for (const status of STATUSES) {
    const count = els.pipelineGrid.querySelector(`[data-pipeline-count="${cssEscape(status)}"]`);
    if (count) {
      count.textContent = statusCount(status);
    }
  }
}

function pipelineDescription(status) {
  return {
    "Anmäld": "Ny intresseanmälan",
    "Kontrollerad": "Register och referenser klara",
    "Utbildning pågår": "Utbildningsmoment återstår",
    "Redo för intervju": "Intervju eller beslut återstår",
    "Godkänd/Certifierad": "Tillgänglig för matchning"
  }[status] || "";
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

function renderSeedButtonState() {
  const sizes = [1, 10, 250];
  const size = sizes.includes(candidates.length)
    && candidates.every((candidate) => candidate.exampleData === true && candidate.exampleDatasetSize === candidates.length)
    ? candidates.length
    : null;
  els.seedButton.textContent = size
    ? `Prototypdata: ${size} ${size === 1 ? "mentor" : "mentorer"}`
    : "Prototypdata";
}

function renderDashboard() {
  els.actionTableBody.innerHTML = "";
  const queue = candidatesNeedingAction();
  const rows = queue.slice(0, 8);
  els.actionQueueSummary.textContent = queue.length > rows.length
    ? `Visar ${rows.length} av ${queue.length} ärenden som har ett nästa steg.`
    : queue.length === 1
      ? "1 ärende har ett nästa steg."
      : queue.length > 1
        ? `${queue.length} ärenden har ett nästa steg.`
        : "Inga ärenden att hantera.";
  els.openActionQueueButton.hidden = queue.length === 0;

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4" class="text-secondary">Inga mentorer kräver åtgärd just nu.</td>`;
    els.actionTableBody.append(row);
    return;
  }

  for (const candidate of rows) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(candidate.caseNumber)}</strong></td>
      <td>${escapeHtml(candidate.name)}<small>${escapeHtml(candidate.coordinator || "Ej tilldelad")}</small></td>
      <td>${escapeHtml(nextStepText(candidate))}<small>${escapeHtml(candidate.status)}</small></td>
      <td><button type="button" class="btn btn-outline-primary btn-sm" data-open-candidate="${candidate.id}">Öppna</button></td>
    `;
    els.actionTableBody.append(row);
  }
}

function renderTable() {
  els.candidateTableBody.innerHTML = "";
  const rows = filteredCandidates();
  const mentorLabel = candidates.length === 1 ? "mentor" : "mentorer";
  els.mentorListCount.textContent = rows.length === candidates.length
    ? `${candidates.length} ${mentorLabel} i registret.`
    : `Visar ${rows.length} av ${candidates.length} ${mentorLabel}.`;

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="text-secondary">Inga mentorer matchar urvalet.</td>`;
    els.candidateTableBody.append(row);
    return;
  }

  for (const candidate of rows) {
    const row = document.createElement("tr");
    row.className = candidate.id === selectedId ? "active" : "";
    row.innerHTML = `
      <td><strong>${escapeHtml(candidate.caseNumber)}</strong><small>${escapeHtml(daysSinceText(candidate.createdAt))}</small></td>
      <td>${escapeHtml(candidate.name)}<small>${escapeHtml(candidate.languages)}</small></td>
      <td><span class="${statusClass(candidate)}">${escapeHtml(candidate.status)}</span></td>
      <td>${escapeHtml(candidate.area)}</td>
      <td>${escapeHtml(candidate.coordinator || "Ej tilldelad")}</td>
      <td>${escapeHtml(formatDate(candidate.updatedAt || candidate.createdAt))}</td>
    `;
    row.addEventListener("click", () => navigateToCandidate(candidate.id));
    els.candidateTableBody.append(row);
  }
}

function filteredHandlers() {
  const term = handlerSearchTerm.trim().toLowerCase();
  return handlers.filter((handler) => {
    const statusMatches = !handlerStatusFilter
      || (handlerStatusFilter === "active" ? handler.active : !handler.active);
    const text = [handler.name, handler.email, handler.role].join(" ").toLowerCase();
    return statusMatches && (!term || text.includes(term));
  });
}

function handlerMentorCount(handler) {
  return candidates.filter((candidate) => candidate.coordinatorId === handler.id
    || (!candidate.coordinatorId && candidate.coordinator === handler.name)).length;
}

function renderHandlers() {
  const rows = filteredHandlers();
  const activeCount = handlers.filter((handler) => handler.active).length;
  els.handlerListCount.textContent = rows.length === handlers.length
    ? `${handlers.length} handläggare i registret, varav ${activeCount} aktiva.`
    : `Visar ${rows.length} av ${handlers.length} handläggare.`;
  els.handlerTableBody.innerHTML = "";

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7" class="text-secondary">Inga handläggare matchar urvalet.</td>';
    els.handlerTableBody.append(row);
    return;
  }

  for (const handler of rows) {
    const assignedCount = handlerMentorCount(handler);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(handler.name)}</strong><small>Användar-ID ${escapeHtml(handler.userId)}</small></td>
      <td><a href="mailto:${escapeHtml(handler.email)}">${escapeHtml(handler.email)}</a></td>
      <td>${escapeHtml(handler.role)}</td>
      <td>${assignedCount}</td>
      <td><span class="badge ${handler.active ? "text-bg-success" : "text-bg-secondary"}">${handler.active ? "Aktiv" : "Inaktiv"}</span></td>
      <td>${escapeHtml(formatDate(handler.updatedAt || handler.createdAt))}</td>
      <td class="text-end text-nowrap">
        <button type="button" class="btn btn-outline-primary btn-sm" data-open-handler="${handler.id}">Öppna</button>
      </td>
    `;
    row.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      navigateToHandler(handler.id);
    });
    els.handlerTableBody.append(row);
  }
}

function selectedHandler() {
  return handlers.find((handler) => handler.id === selectedHandlerId);
}

function renderHandlerDetail() {
  const handler = selectedHandler();
  if (!handler) {
    els.handlerDetailEmpty.hidden = false;
    els.handlerDetail.hidden = true;
    return;
  }

  els.handlerDetailEmpty.hidden = true;
  els.handlerDetail.hidden = false;
  const assignedCount = handlerMentorCount(handler);
  const status = handler.active ? "Aktiv" : "Inaktiv";
  els.selectedHandlerUserId.textContent = `Användar-ID ${handler.userId}`;
  els.selectedHandlerName.textContent = handler.name;
  els.selectedHandlerStatus.textContent = status;
  els.selectedHandlerStatus.className = `badge ${handler.active ? "text-bg-success" : "text-bg-secondary"}`;
  els.selectedHandlerRoleMeta.textContent = handler.role;
  els.selectedHandlerCreatedMeta.textContent = formatDateTime(handler.createdAt);
  els.selectedHandlerUpdatedMeta.textContent = formatDateTime(handler.updatedAt || handler.createdAt);
  els.handlerNameFact.textContent = handler.name;
  els.handlerEmailFact.textContent = handler.email;
  els.handlerRoleFact.textContent = handler.role;
  els.handlerStatusFact.textContent = status;
  els.handlerAssignedFact.textContent = assignedCount;
  els.handlerAssignedEditFact.textContent = assignedCount;
  els.toggleSelectedHandlerButton.textContent = handler.active ? "Inaktivera handläggare" : "Aktivera handläggare";
  els.toggleSelectedHandlerButton.classList.toggle("text-danger", handler.active);
  setHandlerEditMode(false);
}

function setHandlerEditMode(editing) {
  const handler = selectedHandler();
  if (editing && handler) {
    els.editHandlerNameInput.value = handler.name;
    els.editHandlerEmailInput.value = handler.email;
    els.editHandlerEmailInput.setCustomValidity("");
    els.editHandlerRoleInput.value = handler.role;
    els.editHandlerActiveInput.value = handler.active ? "active" : "inactive";
  }
  els.handlerReadView.hidden = editing;
  els.handlerEditForm.hidden = !editing;
  els.editHandlerButton.hidden = editing;
  els.handlerEditActions.hidden = !editing;
  if (editing) els.editHandlerNameInput.focus({ preventScroll: true });
}

function populateCoordinatorSelect(candidate) {
  els.coordinatorInput.innerHTML = '<option value="">Ej tilldelad</option>';
  const available = handlers.filter((handler) => handler.active || handler.id === candidate.coordinatorId);
  for (const handler of available) {
    const option = document.createElement("option");
    option.value = handler.id;
    option.textContent = handler.active ? handler.name : `${handler.name} (inaktiv)`;
    els.coordinatorInput.append(option);
  }
  els.coordinatorInput.value = candidate.coordinatorId || "";
}

function renderDetail() {
  if (isCreatingMentor()) {
    renderNewCandidateDetail();
    return;
  }

  const candidate = selectedCandidate();

  if (!candidate) {
    els.detailEmpty.hidden = false;
    els.candidateDetail.hidden = true;
    renderedDetailId = null;
    return;
  }

  els.detailEmpty.hidden = true;
  els.candidateDetail.hidden = false;
  els.recordMoreActions.hidden = false;
  els.nextActionBar.hidden = false;
  document.querySelectorAll(".detail-tabs .nav-item").forEach((item) => {
    item.hidden = false;
  });
  els.savePersonEditButton.textContent = "Spara ändringar";
  if (renderedDetailId !== candidate.id) {
    closeMeetingForm();
    identityEditMode = false;
    showDefaultMentorTab();
    renderedDetailId = candidate.id;
  }
  els.selectedCaseId.textContent = candidate.caseNumber;
  els.selectedName.textContent = candidate.name;
  els.selectedCoordinatorMeta.textContent = candidate.coordinator || "Ej tilldelad";
  els.selectedCreatedMeta.textContent = formatDateTime(candidate.createdAt);
  els.selectedUpdatedMeta.textContent = formatDateTime(candidate.updatedAt || candidate.createdAt);
  els.selectedStatus.textContent = candidate.status;
  els.selectedStatus.className = statusClass(candidate);
  els.nameFact.textContent = candidate.name;
  els.personalNumberFact.textContent = candidate.personalNumber || "Saknas";
  els.languageFact.textContent = candidate.languages;
  els.availabilityFact.textContent = candidate.availability;
  els.areaFact.textContent = candidate.area;
  els.statusFact.textContent = candidate.status;
  els.coordinatorFact.textContent = candidate.coordinator || "Ej tilldelad";
  const identitySummary = candidate.checks?.identityVerified
    ? `Verifierad med ${identityMethodLabel(candidate.identityMethod)}`
    : "Ej verifierad";
  els.identityMethodFact.textContent = identitySummary;
  els.identityMethodEditFact.textContent = identitySummary;
  const nextAction = nextActionFor(candidate);
  els.nextStepFact.textContent = nextAction.label;
  els.nextStepEditFact.textContent = nextAction.label;
  els.nextActionTitle.textContent = nextAction.label;
  els.nextActionDescription.textContent = nextAction.description;
  els.openNextActionButton.textContent = nextAction.buttonLabel;
  els.openNextActionButton.hidden = !nextAction.tabId;
  els.nextActionBar.classList.toggle("complete", !nextAction.tabId);
  document.querySelectorAll(".detail-tabs .nav-link").forEach((tab) => tab.classList.remove("next-action-tab"));
  if (nextAction.tabId) {
    document.querySelector(`#${nextAction.tabId}`)?.classList.add("next-action-tab");
  }
  const completedChecks = CHECKS.filter(([key]) => candidate.checks?.[key]).length;
  els.checksTabCount.textContent = `${completedChecks}/${CHECKS.length}`;
  els.logTabCount.textContent = candidate.history.length;
  renderMeetings(candidate);
  setPersonEditMode(false);

  els.statusSelect.innerHTML = "";
  for (const status of STATUSES) {
    if (status === "Godkänd/Certifierad" && candidate.status !== "Godkänd/Certifierad") continue;
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === candidate.status;
    els.statusSelect.append(option);
  }

  populateCoordinatorSelect(candidate);
  els.coordinatorFieldRow.classList.toggle("next-required", nextAction.key === "coordinatorAssigned");
  els.interviewDateInput.value = candidate.interviewDate || "";
  els.interviewModeInput.value = candidate.interviewMode || "";
  els.interviewDoneInput.checked = Boolean(candidate.checks?.interviewDone);
  const interviewDoneMeta = candidate.checkMeta?.interviewDone || {};
  els.interviewDoneMeta.textContent = candidate.checks?.interviewDone
    ? `Klar ${formatDateTime(interviewDoneMeta.checkedAt)} av ${interviewDoneMeta.checkedBy || "Ej angivet"}`
    : "Ej klar";
  els.interviewCompletion.classList.toggle("next-required", nextAction.key === "interviewDone");
  const identityVerified = Boolean(candidate.checks?.identityVerified);
  const identityMethodText = identityMethodLabel(candidate.identityMethod);
  els.identityPersonalNumberFact.textContent = candidate.personalNumber || "Saknas";
  els.identityMethodCheckFact.textContent = identityVerified ? identityMethodText : "Ej verifierad";
  els.identityPersonalNumberInput.value = candidate.personalNumber || "";
  els.identityMethodSelect.value = candidate.identityMethod || "";
  els.identityVerificationMeta.hidden = !identityVerified;
  els.identityVerifiedAtFact.textContent = identityVerified ? formatDateTime(candidate.identityVerifiedAt) : "";
  els.identityVerifiedByFact.textContent = identityVerified ? candidate.identityVerifiedBy || "Ej angivet" : "";
  els.identityNoteFact.textContent = identityVerified ? candidate.checkMeta?.identityVerified?.note || "Ingen notering" : "";
  setIdentityEditMode(!identityVerified || identityEditMode);
  els.identityVerificationPanel.classList.toggle("next-required", nextAction.key === "identityVerified");
  els.checklist.innerHTML = "";

  for (const [key, label] of CHECKS) {
    if (key === "identityVerified") continue;
    const column = document.createElement("div");
    column.className = "col-md-6";
    const isNextAction = nextAction.key === key;
    const checked = Boolean(candidate.checks?.[key]);
    const meta = candidate.checkMeta?.[key] || {};
    const metaText = checked
      ? `Klar ${formatDateTime(meta.checkedAt)} av ${meta.checkedBy || "Ej angivet"}`
      : "Ej klar";
    const noteText = checked && meta.note
      ? `<span class="check-row-note">Notering: ${escapeHtml(meta.note)}</span>`
      : "";
    column.innerHTML = `
      <label class="check-row form-check border rounded h-100 ${isNextAction ? "next-required" : ""}">
        <input class="form-check-input" type="checkbox" data-check="${key}" ${checked ? "checked" : ""}>
        <span class="check-row-body">
          <span class="form-check-label">${label}</span>
          <span class="check-row-meta">${escapeHtml(metaText)}</span>
          ${noteText}
        </span>
        ${isNextAction ? '<span class="next-required-marker">Nästa åtgärd</span>' : ""}
      </label>
    `;
    els.checklist.append(column);
  }

  const complete = isComplete(candidate);
  els.approveButton.disabled = !complete;
  els.decisionHint.textContent = complete
    ? "Mentorn uppfyller samtliga krav och kan certifieras."
    : "Handläggare, samtliga kontroller, intervjutid och intervjuform måste vara registrerade innan certifiering.";

  els.auditLog.innerHTML = "";
  for (const item of [...candidate.history].reverse()) {
    const row = document.createElement("tr");
    const actor = item.actor || (item.text.startsWith("Ärende skapat") ? "System" : candidate.coordinator || "System");
    row.innerHTML = `
      <td><time datetime="${escapeHtml(item.at)}">${escapeHtml(formatDateTime(item.at))}</time></td>
      <td>${escapeHtml(item.text)}</td>
      <td>${escapeHtml(actor)}</td>
    `;
    els.auditLog.append(row);
  }

  if (pendingNextActionId === candidate.id) {
    pendingNextActionId = null;
    requestAnimationFrame(() => showNextAction(candidate));
  }
}

function renderNewCandidateDetail() {
  els.detailEmpty.hidden = true;
  els.candidateDetail.hidden = false;
  if (renderedDetailId !== "new") {
    closeMeetingForm();
    identityEditMode = false;
    showDefaultMentorTab();
    renderedDetailId = "new";
  }

  els.selectedCaseId.textContent = "Nytt ärende";
  els.selectedName.textContent = "Ny mentor";
  els.selectedCoordinatorMeta.textContent = "Ej tilldelad";
  els.selectedCreatedMeta.textContent = "Ej skapad";
  els.selectedUpdatedMeta.textContent = "Ej sparad";
  els.selectedStatus.textContent = "Ny";
  els.selectedStatus.className = "badge rounded-pill text-bg-secondary";
  els.recordMoreActions.hidden = true;
  els.nextActionBar.hidden = true;
  document.querySelectorAll(".detail-tabs .nav-item").forEach((item, index) => {
    item.hidden = index > 0;
  });

  els.personReadView.hidden = true;
  els.personEditForm.hidden = false;
  els.editPersonButton.hidden = true;
  els.personEditActions.hidden = false;
  els.savePersonEditButton.textContent = "Spara mentor";
  els.editNameInput.value = "";
  els.editPersonalNumberInput.value = "";
  els.editAreaInput.value = "";
  els.editLanguagesInput.value = "";
  els.editAvailabilityInput.value = "";
  els.statusSelect.innerHTML = "";
  const statusOption = document.createElement("option");
  statusOption.value = "Anmäld";
  statusOption.textContent = "Anmäld";
  els.statusSelect.append(statusOption);
  populateCoordinatorSelect({ coordinatorId: "" });
  els.identityMethodEditFact.textContent = "Ej verifierad";
  els.nextStepEditFact.textContent = "Tilldela handläggare";
}

function renderMeetings(candidate) {
  const candidateMeetings = meetings.filter((meeting) => meeting.mentorId === candidate.id);
  els.meetingsTabCount.textContent = candidateMeetings.length;
  els.meetingsEmpty.hidden = candidateMeetings.length > 0;
  els.meetingsTableWrap.hidden = candidateMeetings.length === 0;
  els.meetingsTableBody.innerHTML = "";

  for (const meeting of candidateMeetings) {
    const meetingType = meeting.type === "Intervju" ? "Certifieringsintervju" : meeting.type;
    const row = document.createElement("tr");
    const nextStep = meeting.nextStep
      ? `<small class="d-block text-secondary mt-1">Nästa steg: ${escapeHtml(meeting.nextStep)}</small>`
      : "";
    row.innerHTML = `
      <td><time datetime="${escapeHtml(meeting.occurredAt)}">${escapeHtml(formatDateTime(meeting.occurredAt))}</time></td>
      <td>${escapeHtml(meetingType)}<small class="d-block text-secondary">${escapeHtml(meeting.mode || "Ej angivet")}</small></td>
      <td class="meeting-summary">${escapeHtml(meeting.summary)}${nextStep}</td>
      <td>${escapeHtml(meeting.createdBy || "Ej angivet")}</td>
      <td class="text-end"><button type="button" class="btn btn-outline-primary btn-sm" data-edit-meeting="${escapeHtml(meeting.id)}">Öppna</button></td>
    `;
    els.meetingsTableBody.append(row);
  }
}

function localDateTimeValue(value = new Date()) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function closeMeetingForm() {
  selectedMeetingId = null;
  els.meetingForm.reset();
  els.meetingForm.hidden = true;
  els.deleteMeetingButton.hidden = true;
}

function openMeetingForm(meeting = null) {
  selectedMeetingId = meeting?.id || null;
  els.meetingForm.reset();
  els.meetingFormTitle.textContent = meeting ? "Redigera möte" : "Nytt möte";
  els.meetingTypeInput.value = meeting?.type === "Intervju" ? "Certifieringsintervju" : meeting?.type || "";
  els.meetingDateInput.value = meeting?.occurredAt ? localDateTimeValue(meeting.occurredAt) : localDateTimeValue();
  els.meetingModeInput.value = meeting?.mode === "Ej angivet" ? "" : meeting?.mode || "";
  els.meetingSummaryInput.value = meeting?.summary || "";
  els.meetingNextStepInput.value = meeting?.nextStep || "";
  els.deleteMeetingButton.hidden = !meeting;
  els.meetingForm.hidden = false;
  els.meetingTypeInput.focus({ preventScroll: true });
  els.meetingForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setIdentityEditMode(editing) {
  const candidate = selectedCandidate();
  const identityVerified = Boolean(candidate?.checks?.identityVerified);
  identityEditMode = !identityVerified || editing;
  els.identityReadView.hidden = identityEditMode;
  els.identityEditView.hidden = !identityEditMode;
  els.editIdentityVerificationButton.hidden = identityEditMode || !identityVerified;
  els.cancelIdentityVerificationButton.hidden = !identityEditMode || !identityVerified;
  els.saveIdentityVerificationButton.hidden = !identityEditMode;
  els.saveIdentityVerificationButton.textContent = identityVerified ? "Spara identitet" : "Registrera identitet";

  if (identityEditMode) {
    els.identityPersonalNumberInput.value = candidate?.personalNumber || "";
    els.identityMethodSelect.value = candidate?.identityMethod || "";
  }
}

function setPersonEditMode(editing) {
  const candidate = selectedCandidate();
  if (editing && candidate) {
    els.editNameInput.value = candidate.name || "";
    els.editPersonalNumberInput.value = candidate.personalNumber || "";
    els.editAreaInput.value = candidate.area || "";
    els.editLanguagesInput.value = candidate.languages || "";
    els.editAvailabilityInput.value = candidate.availability || "";
    els.statusSelect.value = candidate.status || STATUSES[0];
    els.coordinatorInput.value = candidate.coordinatorId || "";
  }

  els.personReadView.hidden = editing;
  els.personEditForm.hidden = !editing;
  els.editPersonButton.hidden = editing;
  els.personEditActions.hidden = !editing;

  if (editing) {
    els.editNameInput.focus({ preventScroll: true });
  }
}

function showDefaultMentorTab() {
  const tab = document.querySelector("#mentor-base-tab");
  if (window.bootstrap && tab) {
    bootstrap.Tab.getOrCreateInstance(tab).show();
  }
}

function showNextAction(candidate) {
  const action = nextActionFor(candidate);
  if (!action.tabId) return;
  const tabElement = document.querySelector(`#${action.tabId}`);
  if (!tabElement || !window.bootstrap) return;
  bootstrap.Tab.getOrCreateInstance(tabElement).show();
  if (action.key === "coordinatorAssigned") setPersonEditMode(true);

  requestAnimationFrame(() => {
    const target = action.key === "coordinatorAssigned"
      ? els.coordinatorInput
      : action.key === "identityVerified"
      ? els.identityPersonalNumberInput
      : action.key === "decision"
      ? els.approveButton
      : action.key === "interviewDone"
        ? !els.interviewDateInput.value
          ? els.interviewDateInput
          : !els.interviewModeInput.value
            ? els.interviewModeInput
            : els.interviewDoneInput
        : els.checklist.querySelector(`[data-check="${cssEscape(action.key)}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  });
}

async function updateSelected(patch, logText) {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const updated = {
    ...candidate,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  if (logText) {
    updated.history = [
      ...(candidate.history || []),
      { at: updated.updatedAt, text: logText, actor: currentUserName() }
    ];
  }
  await saveCandidate(updated);
  markSaved();
  await refresh();
}

function newCandidate(formData) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    id,
    caseNumber: makeCaseNumber(id),
    name: formData.get("name").trim(),
    personalNumber: formData.get("personalNumber").trim(),
    area: formData.get("area").trim(),
    languages: formData.get("languages").trim(),
    availability: formData.get("availability").trim(),
    coordinatorId: "",
    coordinator: "",
    status: "Anmäld",
    checks: Object.fromEntries(CHECKS.map(([key]) => [key, false])),
    checkMeta: buildCheckMeta(),
    interviewDate: "",
    interviewMode: "",
    notes: "",
    identityMethod: "",
    identityVerifiedAt: "",
    identityVerifiedBy: "",
    history: [{ at: now, text: "Ärende skapat", actor: currentUserName() }],
    createdAt: now,
    updatedAt: now
  };
}

function newCandidateFromEditor() {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  return {
    id,
    caseNumber: makeCaseNumber(id),
    name: els.editNameInput.value.trim(),
    personalNumber: els.editPersonalNumberInput.value.trim(),
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim(),
    coordinatorId: coordinator?.id || "",
    coordinator: coordinator?.name || "",
    status: "Anmäld",
    checks: Object.fromEntries(CHECKS.map(([key]) => [key, false])),
    checkMeta: buildCheckMeta(),
    interviewDate: "",
    interviewMode: "",
    notes: "",
    identityMethod: "",
    identityVerifiedAt: "",
    identityVerifiedBy: "",
    history: [{ at: now, text: "Ärende skapat", actor: currentUserName() }],
    createdAt: now,
    updatedAt: now
  };
}

function makeCaseNumber(seed, reserved = new Set()) {
  const digits = String(seed || Date.now()).replace(/\D/g, "");
  const base = digits ? digits.slice(-4).padStart(4, "0") : String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  let suffix = randomDigits(3);
  let caseNumber = `FM-${base}-${suffix}`;

  while (reserved.has(caseNumber)) {
    suffix = randomDigits(3);
    caseNumber = `FM-${base}-${suffix}`;
  }

  return caseNumber;
}

function randomDigits(length) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 10 ** length).padStart(length, "0");
}

function nextHandlerUserId() {
  const highest = handlers.reduce((max, handler) => {
    const match = String(handler.userId || "").match(/^FMU-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);
  return `FMU-${highest + 1}`;
}

function makeExamplePersonalNumber(index) {
  const year = 1970 + index % 30;
  const month = String(index % 12 + 1).padStart(2, "0");
  const day = String(index % 27 + 1).padStart(2, "0");
  const serial = String(100 + index % 900).padStart(3, "0");
  const luhnBase = `${String(year).slice(-2)}${month}${day}${serial}`;
  const validDigit = luhnCheckDigit(luhnBase);
  const invalidDigit = (validDigit + 1) % 10;
  return `${year}${month}${day}-${serial}${invalidDigit}`;
}

function luhnCheckDigit(digits) {
  const sum = [...digits].reduce((total, digit, index) => {
    let value = Number(digit) * (index % 2 === 0 ? 2 : 1);
    if (value > 9) value -= 9;
    return total + value;
  }, 0);
  return (10 - sum % 10) % 10;
}

function identityMethodLabel(method) {
  return {
    bankid: "BankID",
    physical_id: "ID-kort kontrollerat på plats"
  }[method] || "Ej angivet";
}

function statusClass(candidate) {
  if (candidate.status === "Godkänd/Certifierad") {
    return "badge rounded-pill text-bg-success";
  }
  if (isComplete(candidate)) {
    return "badge rounded-pill text-bg-primary";
  }
  if (isBlocked(candidate)) {
    return "badge rounded-pill text-bg-warning";
  }
  return "badge rounded-pill text-bg-secondary";
}

function formatDate(value) {
  if (!value) return "Saknas";
  return new Intl.DateTimeFormat("sv-SE").format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Saknas";
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function daysSinceText(value) {
  if (!value) return "Skapat datum saknas";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? "Skapat idag" : `Skapat för ${days} dagar sedan`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

for (const status of STATUSES) {
  const option = document.createElement("option");
  option.value = status;
  option.textContent = status;
  els.statusFilter.append(option);
}

function openCandidateModal() {
  candidateModal.show();
}

function openHandlerModal(handler = null) {
  els.handlerForm.reset();
  els.handlerEmailInput.setCustomValidity("");
  els.handlerIdInput.value = handler?.id || "";
  els.handlerNameInput.value = handler?.name || "";
  els.handlerEmailInput.value = handler?.email || "";
  els.handlerRoleInput.value = handler?.role || "Handläggare";
  els.handlerActiveInput.checked = handler ? Boolean(handler.active) : true;
  els.handlerModalTitle.textContent = handler ? "Redigera handläggare" : "Ny handläggare";
  handlerModal.show();
}

els.navDashboard.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/dashboard");
});

els.navCandidates.addEventListener("click", (event) => {
  event.preventDefault();
  resetMentorFilters();
  navigateTo("#/mentors");
});

els.navAdministration.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/administration");
});

els.openActionQueueButton.addEventListener("click", (event) => {
  event.preventDefault();
  resetMentorFilters();
  navigateTo("#/mentors/action");
});

els.dashboardMentorRegisterLink.addEventListener("click", (event) => {
  event.preventDefault();
  resetMentorFilters();
  navigateTo("#/mentors");
});

els.newCaseButton.addEventListener("click", navigateToNewCandidate);
els.dashboardNewCaseButton.addEventListener("click", navigateToNewCandidate);

els.cancelNewCaseButton.addEventListener("click", () => {
  els.candidateForm.reset();
});

els.candidateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = newCandidate(new FormData(els.candidateForm));
  await saveCandidate(candidate);
  selectedId = candidate.id;
  els.candidateForm.reset();
  candidateModal.hide();
  markSaved();
  showFeedback("Mentorn har registrerats.");
  await refresh();
  navigateToCandidate(candidate.id);
});

els.searchInput.addEventListener("input", () => {
  searchTerm = els.searchInput.value;
  renderTable();
});

els.statusFilter.addEventListener("change", () => {
  statusFilter = els.statusFilter.value;
  renderTable();
});

els.handlerSearchInput.addEventListener("input", () => {
  handlerSearchTerm = els.handlerSearchInput.value;
  renderHandlers();
});

els.handlerStatusFilter.addEventListener("change", () => {
  handlerStatusFilter = els.handlerStatusFilter.value;
  renderHandlers();
});

els.newHandlerButton.addEventListener("click", () => openHandlerModal());

els.editHandlerButton.addEventListener("click", () => setHandlerEditMode(true));
els.cancelHandlerEditButton.addEventListener("click", () => setHandlerEditMode(false));

els.toggleSelectedHandlerButton.addEventListener("click", async () => {
  const handler = selectedHandler();
  if (!handler) return;
  const assignedCount = handlerMentorCount(handler);
  if (handler.active && assignedCount) {
    const confirmed = window.confirm(`${handler.name} har ${assignedCount} tilldelade mentorärenden. Inaktivera ändå? Befintliga tilldelningar behålls.`);
    if (!confirmed) return;
  }
  await saveHandler({ ...handler, active: !handler.active, updatedAt: new Date().toISOString() });
  markSaved();
  showFeedback(`${handler.name} har ${handler.active ? "inaktiverats" : "aktiverats"}.`);
  await refresh();
});

els.handlerEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const handler = selectedHandler();
  if (!handler) return;
  const name = els.editHandlerNameInput.value.trim();
  const email = els.editHandlerEmailInput.value.trim().toLowerCase();
  const active = els.editHandlerActiveInput.value === "active";
  const duplicate = handlers.some((item) => item.id !== handler.id && item.email.toLowerCase() === email);
  if (duplicate) {
    els.editHandlerEmailInput.setCustomValidity("E-postadressen används redan av en annan handläggare.");
    els.editHandlerEmailInput.reportValidity();
    return;
  }
  els.editHandlerEmailInput.setCustomValidity("");
  const assignedCount = handlerMentorCount(handler);
  if (handler.active && !active && assignedCount) {
    const confirmed = window.confirm(`${handler.name} har ${assignedCount} tilldelade mentorärenden. Inaktivera ändå? Befintliga tilldelningar behålls.`);
    if (!confirmed) return;
  }
  const now = new Date().toISOString();
  await saveHandler({
    ...handler,
    name,
    email,
    role: els.editHandlerRoleInput.value,
    active,
    updatedAt: now
  });
  if (handler.name !== name) {
    const assigned = candidates.filter((candidate) => candidate.coordinatorId === handler.id);
    await Promise.all(assigned.map((candidate) => saveCandidate({
      ...candidate,
      coordinator: name,
      updatedAt: now,
      history: [...(candidate.history || []), { at: now, text: `Handläggarnamn uppdaterat till ${name}`, actor: currentUserName() }]
    })));
  }
  markSaved();
  showFeedback("Handläggaren har uppdaterats.");
  await refresh();
});

els.editHandlerEmailInput.addEventListener("input", () => els.editHandlerEmailInput.setCustomValidity(""));

els.handlerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = els.handlerIdInput.value || crypto.randomUUID();
  const existing = handlers.find((handler) => handler.id === id);
  const name = els.handlerNameInput.value.trim();
  const email = els.handlerEmailInput.value.trim().toLowerCase();
  const duplicate = handlers.some((handler) => handler.id !== id && handler.email.toLowerCase() === email);
  if (duplicate) {
    els.handlerEmailInput.setCustomValidity("E-postadressen används redan av en annan handläggare.");
    els.handlerEmailInput.reportValidity();
    return;
  }
  els.handlerEmailInput.setCustomValidity("");
  if (existing?.active && !els.handlerActiveInput.checked) {
    const assignedCount = handlerMentorCount(existing);
    if (assignedCount) {
      const confirmed = window.confirm(`${existing.name} har ${assignedCount} tilldelade mentorärenden. Inaktivera ändå? Befintliga tilldelningar behålls.`);
      if (!confirmed) return;
    }
  }
  const now = new Date().toISOString();
  await saveHandler({
    id,
    userId: existing?.userId || nextHandlerUserId(),
    name,
    email,
    role: els.handlerRoleInput.value,
    active: els.handlerActiveInput.checked,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });
  if (existing && existing.name !== name) {
    const assigned = candidates.filter((candidate) => candidate.coordinatorId === id);
    await Promise.all(assigned.map((candidate) => saveCandidate({
      ...candidate,
      coordinator: name,
      updatedAt: now,
      history: [...(candidate.history || []), { at: now, text: `Handläggarnamn uppdaterat till ${name}`, actor: currentUserName() }]
    })));
  }
  handlerModal.hide();
  markSaved();
  showFeedback(existing ? "Handläggaren har uppdaterats." : "Handläggaren har registrerats.");
  await refresh();
  if (!existing) navigateToHandler(id);
});

els.handlerEmailInput.addEventListener("input", () => els.handlerEmailInput.setCustomValidity(""));

els.actionTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-candidate]");
  if (!button) return;
  pendingNextActionId = button.dataset.openCandidate;
  navigateToCandidate(button.dataset.openCandidate);
});

els.pipelineGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pipeline-status]");
  if (!button) return;
  navigateToCandidateListWithStatus(button.dataset.pipelineStatus);
});

els.openNextActionButton.addEventListener("click", () => {
  const candidate = selectedCandidate();
  if (candidate) showNextAction(candidate);
});

els.editPersonButton.addEventListener("click", () => setPersonEditMode(true));
els.cancelPersonEditButton.addEventListener("click", () => {
  if (isCreatingMentor()) {
    navigateTo("#/mentors");
    return;
  }
  setPersonEditMode(false);
});
els.personEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isCreatingMentor()) {
    const candidate = newCandidateFromEditor();
    await saveCandidate(candidate);
    selectedId = candidate.id;
    markSaved();
    showFeedback("Mentorn har registrerats.");
    await refresh();
    navigateToCandidate(candidate.id);
    return;
  }
  const candidate = selectedCandidate();
  if (!candidate) return;
  const personalNumber = els.editPersonalNumberInput.value.trim();
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  const requestedStatus = els.statusSelect.value;
  const status = candidate.status !== "Godkänd/Certifierad" && requestedStatus === "Godkänd/Certifierad"
    ? candidate.status
    : requestedStatus;
  const identityInvalidated = candidate.checks?.identityVerified && personalNumber !== candidate.personalNumber;
  const patch = {
    name: els.editNameInput.value.trim(),
    personalNumber,
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim(),
    status,
    coordinatorId: coordinator?.id || "",
    coordinator: coordinator?.name || ""
  };
  if (identityInvalidated) {
    patch.checks = { ...candidate.checks, identityVerified: false };
    patch.checkMeta = {
      ...candidate.checkMeta,
      identityVerified: { checkedAt: "", checkedBy: "", note: "" }
    };
    patch.identityMethod = "";
    patch.identityVerifiedAt = "";
    patch.identityVerifiedBy = "";
  }
  await updateSelected(
    patch,
    identityInvalidated
      ? "Personnummer ändrat; identitetsverifiering måste göras om"
      : "Grund- och ärendeuppgifter uppdaterade"
  );
  setPersonEditMode(false);
  showFeedback("Grunduppgifterna har sparats.");
});
els.interviewDateInput.addEventListener("change", () => updateSelected({ interviewDate: els.interviewDateInput.value }, "Intervjutid uppdaterad"));
els.interviewModeInput.addEventListener("change", () => updateSelected({ interviewMode: els.interviewModeInput.value }, "Intervjuform uppdaterad"));

els.newMeetingButton.addEventListener("click", () => openMeetingForm());
els.cancelMeetingButton.addEventListener("click", closeMeetingForm);
els.meetingsTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-meeting]");
  if (!button) return;
  const meeting = meetings.find((item) => item.id === button.dataset.editMeeting);
  if (meeting) openMeetingForm(meeting);
});

els.meetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = selectedCandidate();
  if (!candidate) return;
  const existing = meetings.find((meeting) => meeting.id === selectedMeetingId);
  const now = new Date().toISOString();
  const type = els.meetingTypeInput.value;
  const occurredAt = els.meetingDateInput.value;
  const mode = els.meetingModeInput.value;
  await saveMeeting({
    id: existing?.id || crypto.randomUUID(),
    mentorId: candidate.id,
    type,
    occurredAt,
    mode,
    summary: els.meetingSummaryInput.value.trim(),
    nextStep: els.meetingNextStepInput.value.trim(),
    createdBy: existing?.createdBy || currentUserName(),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });

  const patch = type === "Certifieringsintervju"
    ? { interviewDate: occurredAt, interviewMode: mode }
    : {};
  await saveCandidate({
    ...candidate,
    ...patch,
    updatedAt: now,
    history: [
      ...(candidate.history || []),
      { at: now, text: `${type} ${existing ? "uppdaterat" : "registrerat"}`, actor: currentUserName() }
    ]
  });
  closeMeetingForm();
  markSaved();
  showFeedback(existing ? "Mötet har uppdaterats." : "Mötet har registrerats.");
  await refresh();
});

els.deleteMeetingButton.addEventListener("click", async () => {
  const meeting = meetings.find((item) => item.id === selectedMeetingId);
  const candidate = selectedCandidate();
  if (!meeting || !candidate) return;
  if (!window.confirm(`Ta bort mötesanteckningen från ${formatDateTime(meeting.occurredAt)}?`)) return;
  await deleteMeeting(meeting.id);
  const now = new Date().toISOString();
  await saveCandidate({
    ...candidate,
    updatedAt: now,
    history: [
      ...(candidate.history || []),
      { at: now, text: `${meeting.type} borttaget`, actor: currentUserName() }
    ]
  });
  closeMeetingForm();
  markSaved();
  showFeedback("Mötet har tagits bort.");
  await refresh();
});

els.editIdentityVerificationButton.addEventListener("click", () => {
  setIdentityEditMode(true);
  els.identityPersonalNumberInput.focus({ preventScroll: true });
});

els.cancelIdentityVerificationButton.addEventListener("click", () => {
  identityEditMode = false;
  setIdentityEditMode(false);
});

els.saveIdentityVerificationButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const personalNumberValid = els.identityPersonalNumberInput.reportValidity();
  const methodValid = els.identityMethodSelect.reportValidity();
  if (!personalNumberValid || !methodValid) return;

  const verifiedAt = new Date().toISOString();
  const method = els.identityMethodSelect.value;
  const alreadyVerified = Boolean(candidate.checks?.identityVerified);
  const confirmation = await confirmAction({
    eyebrow: "Identitetsverifiering",
    title: alreadyVerified ? "Spara ändrad identitet?" : "Registrera identitet?",
    body: `Personnummer och verifieringssätt sparas. Verifieringssätt: ${identityMethodLabel(method)}. Åtgärden registreras med tidpunkt och ansvarig handläggare i ärendets logg.`,
    mentorName: candidate.name,
    confirmLabel: alreadyVerified ? "Spara identitet" : "Registrera identitet"
  });
  if (!confirmation.confirmed) return;
  identityEditMode = false;
  await updateSelected({
    personalNumber: els.identityPersonalNumberInput.value.trim(),
    identityMethod: method,
    identityVerifiedAt: verifiedAt,
    identityVerifiedBy: currentUserName(),
    checks: { ...candidate.checks, identityVerified: true },
    checkMeta: {
      ...candidate.checkMeta,
      identityVerified: { checkedAt: verifiedAt, checkedBy: currentUserName(), note: confirmation.note }
    }
  }, `Identitet registrerad med ${identityMethodLabel(method)}${confirmation.note ? `: ${confirmation.note}` : ""}`);
  showFeedback(`Identiteten har verifierats med ${identityMethodLabel(method)}.`);
});

async function updateCandidateCheck(key, checked) {
  const candidate = selectedCandidate();
  if (!candidate) return false;
  const previousChecked = Boolean(candidate.checks?.[key]);
  if (previousChecked === checked) return true;
  const label = CHECK_LABELS[key] || "Kontroll";
  const confirmation = await confirmAction({
    eyebrow: checked ? "Kontroll i certifieringsflödet" : "Ändra genomförd kontroll",
    title: checked ? `Markera ${label.toLowerCase()} som klar?` : `Ta bort markering för ${label.toLowerCase()}?`,
    body: checked
      ? "Åtgärden registreras med tidpunkt och ansvarig handläggare i ärendets logg."
      : "Kontrollen blir ej klar och ändringen registreras i ärendets logg.",
    mentorName: candidate.name,
    confirmLabel: checked ? "Markera som klar" : "Ta bort markering",
    danger: !checked
  });
  if (!confirmation.confirmed) return false;
  const now = new Date().toISOString();
  const checks = { ...candidate.checks, [key]: checked };
  const checkMeta = {
    ...candidate.checkMeta,
    [key]: checked
      ? { checkedAt: now, checkedBy: currentUserName(), note: confirmation.note }
      : { checkedAt: "", checkedBy: "", note: "" }
  };
  let status = candidate.status;
  if (isComplete({ ...candidate, checks }) && status !== "Godkänd/Certifierad") {
    status = "Redo för intervju";
  } else if (!isComplete({ ...candidate, checks }) && status === "Godkänd/Certifierad") {
    status = statusFromChecks(checks);
  }
  const noteSuffix = confirmation.note ? `: ${confirmation.note}` : "";
  await updateSelected({ checks, checkMeta, status }, `${label}: ${checked ? "klar" : "ej klar"}${noteSuffix}`);
  return true;
}

els.checklist.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-check]");
  if (!input) return;
  const changed = await updateCandidateCheck(input.dataset.check, input.checked);
  if (!changed) input.checked = !input.checked;
});

els.interviewDoneInput.addEventListener("change", async () => {
  if (els.interviewDoneInput.checked && (!els.interviewDateInput.value || !els.interviewModeInput.value)) {
    els.interviewDoneInput.checked = false;
    showFeedback("Ange intervjutid och intervjuform innan intervjun markeras som genomförd.");
    const missingField = !els.interviewDateInput.value ? els.interviewDateInput : els.interviewModeInput;
    missingField.focus();
    return;
  }
  const changed = await updateCandidateCheck("interviewDone", els.interviewDoneInput.checked);
  if (!changed) els.interviewDoneInput.checked = !els.interviewDoneInput.checked;
});

els.approveButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate || !isComplete(candidate)) return;
  await updateSelected({ status: "Godkänd/Certifierad" }, "Mentor godkänd och certifierad");
  showFeedback("Mentorn är godkänd och certifierad.");
});

els.deleteButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const confirmed = window.confirm(`Ta bort ${candidate.name} och hela ärendet ${candidate.caseNumber}? Åtgärden kan inte ångras.`);
  if (!confirmed) return;
  await deleteCandidate(candidate.id);
  selectedId = null;
  markSaved();
  showFeedback("Mentorn och ärendet har tagits bort.");
  await refresh();
  window.location.hash = "#/mentors";
});

els.exampleDataMenu.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-example-count]");
  if (!button) return;
  const count = Number(button.dataset.exampleCount);
  if (![1, 10, 250].includes(count)) return;

  if (candidates.length) {
    const confirmed = window.confirm(`Ersätt nuvarande lokala data med en exempelsamling med ${count} ${count === 1 ? "mentor" : "mentorer"}?`);
    if (!confirmed) return;
  }

  await ensureDefaultHandlers();
  await clearMeetings();
  await replaceCandidates(buildExampleDataset(count));
  selectedId = null;
  searchTerm = "";
  statusFilter = "";
  els.searchInput.value = "";
  els.statusFilter.value = "";
  markSaved();
  showFeedback(`Exempeldata med ${count} ${count === 1 ? "mentor" : "mentorer"} har laddats.`);
  await refresh();
  if (currentView === "mentor") {
    window.location.hash = "#/mentors";
  }
});

els.resetButton.addEventListener("click", async () => {
  const confirmed = window.confirm("Nollställ all lokalt sparad prototypdata? Mentorärenden tas bort och grundhandläggarna återställs. Åtgärden kan inte ångras.");
  if (!confirmed) return;
  await Promise.all([clearCandidates(), clearHandlers(), clearMeetings()]);
  await ensureDefaultHandlers();
  selectedId = null;
  markSaved();
  showFeedback("Prototypdatan har nollställts och grundhandläggare har återställts.");
  await refresh();
});

window.addEventListener("hashchange", renderAll);

openDatabase()
  .then(async (database) => {
    const modalElement = document.querySelector("#candidateModal");
    candidateModal = new bootstrap.Modal(modalElement);
    const handlerModalElement = document.querySelector("#handlerModal");
    handlerModal = new bootstrap.Modal(handlerModalElement);
    confirmActionModal = new bootstrap.Modal(els.confirmActionModal);
    modalElement.addEventListener("shown.bs.modal", () => document.querySelector("#nameInput").focus());
    handlerModalElement.addEventListener("shown.bs.modal", () => els.handlerNameInput.focus());
    els.confirmActionButton.addEventListener("click", () => {
      resolveConfirmation(true);
      confirmActionModal.hide();
    });
    els.confirmActionModal.addEventListener("hidden.bs.modal", () => resolveConfirmation(false));
    db = database;
    await ensureDefaultHandlers();
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }
    await refresh();
  })
  .catch((error) => {
    document.body.innerHTML = `<main class="p-4"><h1>Kunde inte öppna IndexedDB</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
