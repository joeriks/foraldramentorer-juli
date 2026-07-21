const DB_NAME = "foraldramentorer";
const DB_VERSION = 1;
const STORE = "candidates";

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

const seedCandidates = [
  {
    name: "Anna Lind",
    area: "Centrum",
    languages: "Svenska, engelska",
    availability: "Vardagskvällar",
    coordinator: "Maja",
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
    coordinator: "Maja",
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
    coordinator: "Jonas",
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
    coordinator: "Jonas",
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
    coordinator: "Maja",
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
    coordinator: "Sara",
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
    coordinator: "Sara",
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
    coordinator: "Jonas",
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
    coordinator: "Sara"
  },
  {
    ...seedCandidates[6],
    name: "Omar Rahimi",
    area: "Öster",
    languages: "Svenska, dari",
    availability: "Dagtid och helger",
    coordinator: "Maja"
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

let db;
let candidates = [];
let selectedId = null;
let searchTerm = "";
let statusFilter = "";
let candidateModal;
let currentView = "dashboard";

const els = {
  pageTitle: document.querySelector("#pageTitle"),
  breadcrumb: document.querySelector("#breadcrumb"),
  navDashboard: document.querySelector("#navDashboard"),
  navCandidates: document.querySelector("#navCandidates"),
  dashboardView: document.querySelector("#dashboardView"),
  candidatesView: document.querySelector("#candidatesView"),
  detailView: document.querySelector("#detailView"),
  totalCount: document.querySelector("#totalCount"),
  pipelineGrid: document.querySelector("#pipelineBoard .pipeline-grid"),
  actionTableBody: document.querySelector("#actionTableBody"),
  seedButton: document.querySelector("#seedButton"),
  exampleDataMenu: document.querySelector("#exampleDataMenu"),
  resetButton: document.querySelector("#resetButton"),
  newCaseButton: document.querySelector("#newCaseButton"),
  dashboardNewCaseButton: document.querySelector("#dashboardNewCaseButton"),
  cancelNewCaseButton: document.querySelector("#cancelNewCaseButton"),
  candidateForm: document.querySelector("#candidateForm"),
  candidateTableBody: document.querySelector("#candidateTableBody"),
  mentorListCount: document.querySelector("#mentorListCount"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  detailEmpty: document.querySelector("#detailEmpty"),
  candidateDetail: document.querySelector("#candidateDetail"),
  selectedCaseId: document.querySelector("#selectedCaseId"),
  selectedStatus: document.querySelector("#selectedStatus"),
  selectedName: document.querySelector("#selectedName"),
  selectedMeta: document.querySelector("#selectedMeta"),
  selectedUpdated: document.querySelector("#selectedUpdated"),
  editPersonButton: document.querySelector("#editPersonButton"),
  personEditActions: document.querySelector("#personEditActions"),
  personReadView: document.querySelector("#personReadView"),
  personEditForm: document.querySelector("#personEditForm"),
  cancelPersonEditButton: document.querySelector("#cancelPersonEditButton"),
  editNameInput: document.querySelector("#editNameInput"),
  editAreaInput: document.querySelector("#editAreaInput"),
  editLanguagesInput: document.querySelector("#editLanguagesInput"),
  editAvailabilityInput: document.querySelector("#editAvailabilityInput"),
  statusSelect: document.querySelector("#statusSelect"),
  coordinatorInput: document.querySelector("#coordinatorInput"),
  nameFact: document.querySelector("#nameFact"),
  languageFact: document.querySelector("#languageFact"),
  availabilityFact: document.querySelector("#availabilityFact"),
  areaFact: document.querySelector("#areaFact"),
  checklist: document.querySelector("#checklist"),
  interviewDateInput: document.querySelector("#interviewDateInput"),
  interviewModeInput: document.querySelector("#interviewModeInput"),
  notesInput: document.querySelector("#notesInput"),
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
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
  return exampleTemplates(count).map((candidate) => {
    const id = crypto.randomUUID();
    return {
      ...candidate,
      checks: { ...candidate.checks },
      id,
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
  candidates = await getAllCandidates();
  candidates = candidates.map(normalizeCandidate);
  await ensureUniqueCaseNumbers();
  candidates.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.name.localeCompare(b.name, "sv"));
  renderAll();
}

function renderAll() {
  applyRoute();
  renderSummary();
  renderPipeline();
  renderDashboard();
  renderTable();
  renderDetail();
}

function normalizeCandidate(candidate) {
  return {
    ...candidate,
    caseNumber: candidate.caseNumber || makeCaseNumber(candidate.id || candidate.createdAt),
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
    const text = [
      candidate.caseNumber,
      candidate.name,
      candidate.area,
      candidate.languages,
      candidate.availability,
      candidate.coordinator,
      candidate.status
    ].join(" ").toLowerCase();
    return statusMatches && (!term || text.includes(term));
  });
}

function candidatesNeedingAction() {
  return candidates.filter((candidate) => {
    return isBlocked(candidate) || isComplete(candidate) && candidate.status !== "Godkänd/Certifierad";
  });
}

function isComplete(candidate) {
  return CHECKS.every(([key]) => candidate.checks?.[key]);
}

function isBlocked(candidate) {
  return !candidate.checks?.identityVerified || !candidate.checks?.registryChecked || !candidate.checks?.referencesDone;
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
  currentView = ["dashboard", "mentors", "mentor"].includes(route.view) ? route.view : "dashboard";
  selectedId = currentView === "mentor" ? route.id : selectedId;

  els.dashboardView.hidden = currentView !== "dashboard";
  els.candidatesView.hidden = currentView !== "mentors";
  els.detailView.hidden = currentView !== "mentor";

  els.navDashboard.classList.toggle("active", currentView === "dashboard");
  els.navCandidates.classList.toggle("active", currentView === "mentors" || currentView === "mentor");

  if (currentView === "dashboard") {
    els.pageTitle.textContent = "Dashboard";
    els.breadcrumb.textContent = "Start / Dashboard";
  } else if (currentView === "mentors") {
    els.pageTitle.textContent = "Mentorregister";
    els.breadcrumb.textContent = "Start / Onboarding / Mentorregister";
  } else {
    els.pageTitle.textContent = "Mentorkort";
    els.breadcrumb.textContent = "Start / Onboarding / Mentorkort";
  }
}

function navigateToCandidate(id) {
  window.location.hash = `#/mentor/${id}`;
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
    "Kontrollerad": "Register och referenser",
    "Utbildning pågår": "E-learning kvar",
    "Redo för intervju": "Väntar på beslut",
    "Godkänd/Certifierad": "Aktiv i matchning"
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
    ? `Exempeldata: ${size} ${size === 1 ? "mentor" : "mentorer"}`
    : "Välj exempeldata";
}

function renderDashboard() {
  els.actionTableBody.innerHTML = "";
  const rows = candidatesNeedingAction().slice(0, 8);

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
      <td><span class="${statusClass(candidate)}">${escapeHtml(candidate.status)}</span></td>
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

function renderDetail() {
  const candidate = selectedCandidate();

  if (!candidate) {
    els.detailEmpty.hidden = false;
    els.candidateDetail.hidden = true;
    return;
  }

  els.detailEmpty.hidden = true;
  els.candidateDetail.hidden = false;
  showDefaultMentorTab();
  els.selectedCaseId.textContent = `Ärende ${candidate.caseNumber}`;
  els.selectedName.textContent = candidate.name;
  els.selectedMeta.textContent = `${candidate.area} · ${candidate.languages} · ${candidate.availability}`;
  els.selectedUpdated.textContent = `Senast ändrad ${formatDateTime(candidate.updatedAt || candidate.createdAt)}`;
  els.selectedStatus.textContent = candidate.status;
  els.selectedStatus.className = statusClass(candidate);
  els.nameFact.textContent = candidate.name;
  els.languageFact.textContent = candidate.languages;
  els.availabilityFact.textContent = candidate.availability;
  els.areaFact.textContent = candidate.area;
  setPersonEditMode(false);

  els.statusSelect.innerHTML = "";
  for (const status of STATUSES) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === candidate.status;
    els.statusSelect.append(option);
  }

  els.coordinatorInput.value = candidate.coordinator || "";
  els.interviewDateInput.value = candidate.interviewDate || "";
  els.interviewModeInput.value = candidate.interviewMode || "";
  els.notesInput.value = candidate.notes || "";
  els.checklist.innerHTML = "";

  for (const [key, label] of CHECKS) {
    const column = document.createElement("div");
    column.className = "col-md-6";
    column.innerHTML = `
      <label class="form-check border rounded p-2 h-100">
        <input class="form-check-input ms-0 me-2" type="checkbox" data-check="${key}" ${candidate.checks?.[key] ? "checked" : ""}>
        <span class="form-check-label">${label}</span>
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
    const li = document.createElement("li");
    li.innerHTML = `<time>${escapeHtml(formatDateTime(item.at))}</time>${escapeHtml(item.text)}`;
    els.auditLog.append(li);
  }
}

function setPersonEditMode(editing) {
  const candidate = selectedCandidate();
  if (editing && candidate) {
    els.editNameInput.value = candidate.name || "";
    els.editAreaInput.value = candidate.area || "";
    els.editLanguagesInput.value = candidate.languages || "";
    els.editAvailabilityInput.value = candidate.availability || "";
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

async function updateSelected(patch, logText) {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const updated = {
    ...candidate,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  if (logText) {
    updated.history = [...(candidate.history || []), { at: updated.updatedAt, text: logText }];
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
    area: formData.get("area").trim(),
    languages: formData.get("languages").trim(),
    availability: formData.get("availability").trim(),
    coordinator: "",
    status: "Anmäld",
    checks: Object.fromEntries(CHECKS.map(([key]) => [key, false])),
    interviewDate: "",
    interviewMode: "",
    notes: "",
    history: [{ at: now, text: "Ärende skapat" }],
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

els.navDashboard.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo("#/dashboard");
});

els.navCandidates.addEventListener("click", (event) => {
  event.preventDefault();
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

els.actionTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-candidate]");
  if (!button) return;
  navigateToCandidate(button.dataset.openCandidate);
});

els.pipelineGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pipeline-status]");
  if (!button) return;
  navigateToCandidateListWithStatus(button.dataset.pipelineStatus);
});

els.statusSelect.addEventListener("change", () => updateSelected({ status: els.statusSelect.value }, `Status ändrad till ${els.statusSelect.value}`));
els.coordinatorInput.addEventListener("change", () => updateSelected({ coordinator: els.coordinatorInput.value.trim() }, "Handläggare uppdaterad"));
els.editPersonButton.addEventListener("click", () => setPersonEditMode(true));
els.cancelPersonEditButton.addEventListener("click", () => setPersonEditMode(false));
els.personEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await updateSelected({
    name: els.editNameInput.value.trim(),
    area: els.editAreaInput.value.trim(),
    languages: els.editLanguagesInput.value.trim(),
    availability: els.editAvailabilityInput.value.trim()
  }, "Grunduppgifter uppdaterade");
  setPersonEditMode(false);
  showFeedback("Grunduppgifterna har sparats.");
});
els.interviewDateInput.addEventListener("change", () => updateSelected({ interviewDate: els.interviewDateInput.value }, "Intervjutid uppdaterad"));
els.interviewModeInput.addEventListener("change", () => updateSelected({ interviewMode: els.interviewModeInput.value }, "Intervjuform uppdaterad"));
els.notesInput.addEventListener("change", () => updateSelected({ notes: els.notesInput.value.trim() }, "Intervjuprotokoll uppdaterat"));

els.checklist.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-check]");
  const candidate = selectedCandidate();
  if (!input || !candidate) return;
  const checks = { ...candidate.checks, [input.dataset.check]: input.checked };
  let status = candidate.status;
  if (isComplete({ ...candidate, checks }) && status !== "Godkänd/Certifierad") {
    status = "Redo för intervju";
  }
  const label = CHECKS.find(([key]) => key === input.dataset.check)?.[1] || "Kontroll";
  await updateSelected({ checks, status }, `${label}: ${input.checked ? "klar" : "ej klar"}`);
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
  const confirmed = window.confirm("Nollställ all lokalt sparad prototypdata i den här webbläsaren? Åtgärden kan inte ångras.");
  if (!confirmed) return;
  await clearCandidates();
  selectedId = null;
  markSaved();
  showFeedback("Den lokala prototypdatan har nollställts.");
  await refresh();
});

window.addEventListener("hashchange", renderAll);

openDatabase()
  .then(async (database) => {
    const modalElement = document.querySelector("#candidateModal");
    candidateModal = new bootstrap.Modal(modalElement);
    modalElement.addEventListener("shown.bs.modal", () => document.querySelector("#nameInput").focus());
    db = database;
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }
    await refresh();
  })
  .catch((error) => {
    document.body.innerHTML = `<main class="p-4"><h1>Kunde inte öppna IndexedDB</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
