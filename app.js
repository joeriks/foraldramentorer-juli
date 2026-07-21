const DB_NAME = "foraldramentorer";
const DB_VERSION = 2;
const STORE = "candidates";
const HANDLERS_STORE = "handlers";
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
  { id: "handler-maja", name: "Maja Ekström", email: "maja.ekstrom@kommun.example", role: "Handläggare", active: true },
  { id: "handler-jonas", name: "Jonas Berg", email: "jonas.berg@kommun.example", role: "Handläggare", active: true },
  { id: "handler-sara", name: "Sara Lind", email: "sara.lind@kommun.example", role: "Samordnare", active: true }
];

let db;
let candidates = [];
let handlers = [];
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
  editPersonButton: document.querySelector("#editPersonButton"),
  personEditActions: document.querySelector("#personEditActions"),
  personReadView: document.querySelector("#personReadView"),
  personEditForm: document.querySelector("#personEditForm"),
  cancelPersonEditButton: document.querySelector("#cancelPersonEditButton"),
  editNameInput: document.querySelector("#editNameInput"),
  editPersonalNumberInput: document.querySelector("#editPersonalNumberInput"),
  editAreaInput: document.querySelector("#editAreaInput"),
  editLanguagesInput: document.querySelector("#editLanguagesInput"),
  editAvailabilityInput: document.querySelector("#editAvailabilityInput"),
  statusSelect: document.querySelector("#statusSelect"),
  coordinatorInput: document.querySelector("#coordinatorInput"),
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
  logTabCount: document.querySelector("#logTabCount"),
  checklist: document.querySelector("#checklist"),
  identityVerificationPanel: document.querySelector("#identityVerificationPanel"),
  identityVerificationStatus: document.querySelector("#identityVerificationStatus"),
  identityPersonalNumberInput: document.querySelector("#identityPersonalNumberInput"),
  identityMethodSelect: document.querySelector("#identityMethodSelect"),
  identityVerificationMeta: document.querySelector("#identityVerificationMeta"),
  identityVerifiedAtFact: document.querySelector("#identityVerifiedAtFact"),
  identityVerifiedByFact: document.querySelector("#identityVerifiedByFact"),
  saveIdentityVerificationButton: document.querySelector("#saveIdentityVerificationButton"),
  interviewDateInput: document.querySelector("#interviewDateInput"),
  interviewModeInput: document.querySelector("#interviewModeInput"),
  notesInput: document.querySelector("#notesInput"),
  interviewCompletion: document.querySelector("#interviewCompletion"),
  interviewDoneInput: document.querySelector("#interviewDoneInput"),
  decisionHint: document.querySelector("#decisionHint"),
  approveButton: document.querySelector("#approveButton"),
  deleteButton: document.querySelector("#deleteButton"),
  auditLog: document.querySelector("#auditLog"),
  saveStatus: document.querySelector("#saveStatus"),
  feedbackToast: document.querySelector("#feedbackToast"),
  feedbackToastBody: document.querySelector("#feedbackToastBody")
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
    const request = tx("readwrite").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
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
  if (count === 1) return seedCandidates.slice(0, 1);
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
    return {
      ...candidate,
      checks: { ...candidate.checks },
      id,
      personalNumber: makeExamplePersonalNumber(index),
      identityMethod: identityVerified ? (index % 2 === 0 ? "bankid" : "physical_id") : "",
      identityVerifiedAt: identityVerified ? now : "",
      identityVerifiedBy: identityVerified ? candidate.coordinator || "System" : "",
      exampleData: true,
      exampleDatasetSize: count,
      caseNumber: makeCaseNumber(id),
      history: [
        { at: now, text: "Ärende skapat som exempeldata" },
        { at: now, text: `Status satt till ${candidate.status}` }
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
  await migrateCoordinatorReferences();
  await ensureUniqueCaseNumbers();
  candidates.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.name.localeCompare(b.name, "sv"));
  renderAll();
}

async function migrateDefaultHandlerRecords() {
  const legacyNames = {
    "handler-maja": "Maja",
    "handler-jonas": "Jonas",
    "handler-sara": "Sara"
  };
  const updates = [];
  for (const handler of handlers) {
    const template = seedHandlers.find((item) => item.id === handler.id);
    if (!template) continue;
    const legacyEmail = `${legacyNames[handler.id]?.toLowerCase()}@kommun.example`;
    const name = handler.name === legacyNames[handler.id] ? template.name : handler.name;
    const email = handler.email === legacyEmail ? template.email : handler.email;
    if (name === handler.name && email === handler.email) continue;
    Object.assign(handler, { name, email, updatedAt: new Date().toISOString() });
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
    || { id: CURRENT_USER_ID, name: "Sara Lind", role: "Samordnare" };
}

function currentUserName() {
  return currentUser().name;
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
  return {
    ...candidate,
    personalNumber,
    identityMethod,
    identityVerifiedAt: identityVerified ? candidate.identityVerifiedAt || candidate.updatedAt || candidate.createdAt : "",
    identityVerifiedBy: identityVerified ? candidate.identityVerifiedBy || candidate.coordinator || "System" : "",
    checks: {
      ...(candidate.checks || {}),
      identityVerified
    },
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
  return candidate.status !== "Godkänd/Certifierad";
}

function isComplete(candidate) {
  return CHECKS.every(([key]) => candidate.checks?.[key]);
}

function isBlocked(candidate) {
  return !candidate.checks?.identityVerified || !candidate.checks?.registryChecked || !candidate.checks?.referencesDone;
}

function nextStepText(candidate) {
  return nextActionFor(candidate).label;
}

function nextActionFor(candidate) {
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
    els.pageTitle.textContent = "Mentorkort";
    els.breadcrumb.textContent = "Start / Onboarding / Mentorkort";
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
      <td><strong>${escapeHtml(handler.name)}</strong></td>
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
  const candidate = selectedCandidate();

  if (!candidate) {
    els.detailEmpty.hidden = false;
    els.candidateDetail.hidden = true;
    renderedDetailId = null;
    return;
  }

  els.detailEmpty.hidden = true;
  els.candidateDetail.hidden = false;
  if (renderedDetailId !== candidate.id) {
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
  setPersonEditMode(false);

  els.statusSelect.innerHTML = "";
  for (const status of STATUSES) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === candidate.status;
    els.statusSelect.append(option);
  }

  populateCoordinatorSelect(candidate);
  els.interviewDateInput.value = candidate.interviewDate || "";
  els.interviewModeInput.value = candidate.interviewMode || "";
  els.notesInput.value = candidate.notes || "";
  els.interviewDoneInput.checked = Boolean(candidate.checks?.interviewDone);
  els.interviewCompletion.classList.toggle("next-required", nextAction.key === "interviewDone");
  const identityVerified = Boolean(candidate.checks?.identityVerified);
  els.identityPersonalNumberInput.value = candidate.personalNumber || "";
  els.identityMethodSelect.value = candidate.identityMethod || "";
  els.identityVerificationStatus.textContent = identityVerified
    ? `Verifierad med ${identityMethodLabel(candidate.identityMethod)}`
    : "Ej verifierad";
  els.identityVerificationStatus.className = identityVerified
    ? "badge text-bg-success"
    : "badge text-bg-warning";
  els.identityVerificationMeta.hidden = !identityVerified;
  els.identityVerifiedAtFact.textContent = identityVerified ? formatDateTime(candidate.identityVerifiedAt) : "";
  els.identityVerifiedByFact.textContent = identityVerified ? candidate.identityVerifiedBy || "Ej angivet" : "";
  els.saveIdentityVerificationButton.textContent = identityVerified ? "Uppdatera verifiering" : "Registrera verifiering";
  els.identityVerificationPanel.classList.toggle("next-required", nextAction.key === "identityVerified");
  els.checklist.innerHTML = "";

  for (const [key, label] of CHECKS) {
    if (key === "identityVerified") continue;
    const column = document.createElement("div");
    column.className = "col-md-6";
    const isNextAction = nextAction.key === key;
    column.innerHTML = `
      <label class="form-check border rounded p-2 h-100 ${isNextAction ? "next-required" : ""}">
        <input class="form-check-input ms-0 me-2" type="checkbox" data-check="${key}" ${candidate.checks?.[key] ? "checked" : ""}>
        <span class="form-check-label">${label}</span>
        ${isNextAction ? '<span class="next-required-marker">Nästa åtgärd</span>' : ""}
      </label>
    `;
    els.checklist.append(column);
  }

  const complete = isComplete(candidate);
  els.approveButton.disabled = !complete;
  els.decisionHint.textContent = complete
    ? "Mentorn uppfyller samtliga krav och kan certifieras."
    : "Alla kontroller, utbildningsmoment och intervjun måste vara klara innan certifiering.";

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

  requestAnimationFrame(() => {
    const target = action.key === "identityVerified"
      ? els.identityPersonalNumberInput
      : action.key === "decision"
      ? els.approveButton
      : action.key === "interviewDone"
        ? els.interviewDateInput.value ? els.interviewDoneInput : els.interviewDateInput
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

els.newCaseButton.addEventListener("click", openCandidateModal);
els.dashboardNewCaseButton.addEventListener("click", openCandidateModal);

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
els.cancelPersonEditButton.addEventListener("click", () => setPersonEditMode(false));
els.personEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = selectedCandidate();
  if (!candidate) return;
  const personalNumber = els.editPersonalNumberInput.value.trim();
  const coordinator = handlers.find((handler) => handler.id === els.coordinatorInput.value);
  const identityInvalidated = candidate.checks?.identityVerified && personalNumber !== candidate.personalNumber;
  const patch = {
    name: els.editNameInput.value.trim(),
    personalNumber,
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim(),
    status: els.statusSelect.value,
    coordinatorId: coordinator?.id || "",
    coordinator: coordinator?.name || ""
  };
  if (identityInvalidated) {
    patch.checks = { ...candidate.checks, identityVerified: false };
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
els.notesInput.addEventListener("change", () => updateSelected({ notes: els.notesInput.value.trim() }, "Intervjuprotokoll uppdaterat"));

els.saveIdentityVerificationButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const personalNumberValid = els.identityPersonalNumberInput.reportValidity();
  const methodValid = els.identityMethodSelect.reportValidity();
  if (!personalNumberValid || !methodValid) return;

  const verifiedAt = new Date().toISOString();
  const method = els.identityMethodSelect.value;
  await updateSelected({
    personalNumber: els.identityPersonalNumberInput.value.trim(),
    identityMethod: method,
    identityVerifiedAt: verifiedAt,
    identityVerifiedBy: currentUserName(),
    checks: { ...candidate.checks, identityVerified: true }
  }, `Identitet verifierad med ${identityMethodLabel(method)}`);
  showFeedback(`Identiteten har verifierats med ${identityMethodLabel(method)}.`);
});

async function updateCandidateCheck(key, checked) {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const checks = { ...candidate.checks, [key]: checked };
  let status = candidate.status;
  if (isComplete({ ...candidate, checks }) && status !== "Godkänd/Certifierad") {
    status = "Redo för intervju";
  }
  const label = CHECKS.find(([checkKey]) => checkKey === key)?.[1] || "Kontroll";
  await updateSelected({ checks, status }, `${label}: ${checked ? "klar" : "ej klar"}`);
}

els.checklist.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-check]");
  if (!input) return;
  await updateCandidateCheck(input.dataset.check, input.checked);
});

els.interviewDoneInput.addEventListener("change", () => updateCandidateCheck("interviewDone", els.interviewDoneInput.checked));

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
  await Promise.all([clearCandidates(), clearHandlers()]);
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
    modalElement.addEventListener("shown.bs.modal", () => document.querySelector("#nameInput").focus());
    handlerModalElement.addEventListener("shown.bs.modal", () => els.handlerNameInput.focus());
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
