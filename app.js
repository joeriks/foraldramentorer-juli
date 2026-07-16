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
  }
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
  readyCount: document.querySelector("#readyCount"),
  certifiedCount: document.querySelector("#certifiedCount"),
  blockedCount: document.querySelector("#blockedCount"),
  actionTableBody: document.querySelector("#actionTableBody"),
  seedButton: document.querySelector("#seedButton"),
  resetButton: document.querySelector("#resetButton"),
  newCaseButton: document.querySelector("#newCaseButton"),
  dashboardNewCaseButton: document.querySelector("#dashboardNewCaseButton"),
  cancelNewCaseButton: document.querySelector("#cancelNewCaseButton"),
  candidateForm: document.querySelector("#candidateForm"),
  candidateTableBody: document.querySelector("#candidateTableBody"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  detailEmpty: document.querySelector("#detailEmpty"),
  candidateDetail: document.querySelector("#candidateDetail"),
  selectedCaseId: document.querySelector("#selectedCaseId"),
  selectedStatus: document.querySelector("#selectedStatus"),
  selectedName: document.querySelector("#selectedName"),
  selectedMeta: document.querySelector("#selectedMeta"),
  statusSelect: document.querySelector("#statusSelect"),
  coordinatorInput: document.querySelector("#coordinatorInput"),
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
  auditLog: document.querySelector("#auditLog")
};

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
    view: view || "dashboard",
    id: id || null
  };
}

function applyRoute() {
  const route = parseRoute();
  currentView = ["dashboard", "candidates", "candidate"].includes(route.view) ? route.view : "dashboard";
  selectedId = currentView === "candidate" ? route.id : selectedId;

  els.dashboardView.hidden = currentView !== "dashboard";
  els.candidatesView.hidden = currentView !== "candidates";
  els.detailView.hidden = currentView !== "candidate";

  els.navDashboard.classList.toggle("active", currentView === "dashboard");
  els.navCandidates.classList.toggle("active", currentView === "candidates" || currentView === "candidate");

  if (currentView === "dashboard") {
    els.pageTitle.textContent = "Dashboard";
    els.breadcrumb.textContent = "Start / Dashboard";
  } else if (currentView === "candidates") {
    els.pageTitle.textContent = "Kandidatlista";
    els.breadcrumb.textContent = "Start / Onboarding / Kandidatlista";
  } else {
    els.pageTitle.textContent = "Kandidatkort";
    els.breadcrumb.textContent = "Start / Onboarding / Kandidatkort";
  }
}

function navigateToCandidate(id) {
  window.location.hash = `#/candidate/${id}`;
}

function navigateTo(hash) {
  if (window.location.hash === hash) {
    renderAll();
    return;
  }
  window.location.hash = hash;
}

function renderSummary() {
  els.totalCount.textContent = candidates.length;
  els.readyCount.textContent = candidates.filter((candidate) => isComplete(candidate) && candidate.status !== "Godkänd/Certifierad").length;
  els.certifiedCount.textContent = candidates.filter((candidate) => candidate.status === "Godkänd/Certifierad").length;
  els.blockedCount.textContent = candidates.filter(isBlocked).length;
}

function renderDashboard() {
  els.actionTableBody.innerHTML = "";
  const rows = candidatesNeedingAction().slice(0, 8);

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4" class="text-secondary">Inga kandidater kräver åtgärd just nu.</td>`;
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

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="text-secondary">Inga kandidater matchar urvalet.</td>`;
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
  els.selectedCaseId.textContent = `Ärende ${candidate.caseNumber}`;
  els.selectedName.textContent = candidate.name;
  els.selectedMeta.textContent = `${candidate.area} · ${candidate.languages} · ${candidate.availability}`;
  els.selectedStatus.textContent = candidate.status;
  els.selectedStatus.className = statusClass(candidate);
  els.languageFact.textContent = candidate.languages;
  els.availabilityFact.textContent = candidate.availability;
  els.areaFact.textContent = candidate.area;

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
    ? "Kandidaten uppfyller samtliga krav och kan certifieras."
    : "Alla kontroller, utbildningsmoment och intervjun måste vara klara innan certifiering.";

  els.auditLog.innerHTML = "";
  for (const item of [...candidate.history].reverse()) {
    const li = document.createElement("li");
    li.innerHTML = `<time>${escapeHtml(formatDateTime(item.at))}</time>${escapeHtml(item.text)}`;
    els.auditLog.append(li);
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
  navigateTo("#/candidates");
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

els.statusSelect.addEventListener("change", () => updateSelected({ status: els.statusSelect.value }, `Status ändrad till ${els.statusSelect.value}`));
els.coordinatorInput.addEventListener("change", () => updateSelected({ coordinator: els.coordinatorInput.value.trim() }, "Handläggare uppdaterad"));
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
  await updateSelected({ status: "Godkänd/Certifierad" }, "Kandidat godkänd och certifierad");
});

els.deleteButton.addEventListener("click", async () => {
  const candidate = selectedCandidate();
  if (!candidate) return;
  await deleteCandidate(candidate.id);
  selectedId = null;
  await refresh();
  window.location.hash = "#/candidates";
});

els.seedButton.addEventListener("click", async () => {
  const now = new Date().toISOString();
  for (const candidate of seedCandidates) {
    const id = crypto.randomUUID();
    await saveCandidate({
      ...candidate,
      id,
      caseNumber: makeCaseNumber(id),
      history: [
        { at: now, text: "Ärende skapat" },
        { at: now, text: `Status satt till ${candidate.status}` }
      ],
      createdAt: now,
      updatedAt: now
    });
  }
  await refresh();
});

els.resetButton.addEventListener("click", async () => {
  await clearCandidates();
  selectedId = null;
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
