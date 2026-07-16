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

const els = {
  totalCount: document.querySelector("#totalCount"),
  readyCount: document.querySelector("#readyCount"),
  certifiedCount: document.querySelector("#certifiedCount"),
  blockedCount: document.querySelector("#blockedCount"),
  seedButton: document.querySelector("#seedButton"),
  resetButton: document.querySelector("#resetButton"),
  newCaseButton: document.querySelector("#newCaseButton"),
  cancelNewCaseButton: document.querySelector("#cancelNewCaseButton"),
  candidateForm: document.querySelector("#candidateForm"),
  candidateTableBody: document.querySelector("#candidateTableBody"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  emptyState: document.querySelector("#emptyState"),
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
  candidates.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.name.localeCompare(b.name, "sv"));
  renderSummary();
  renderTable();
  renderDetail();
}

function normalizeCandidate(candidate) {
  return {
    ...candidate,
    caseNumber: candidate.caseNumber || makeCaseNumber(candidate.createdAt || candidate.id),
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

function isComplete(candidate) {
  return CHECKS.every(([key]) => candidate.checks?.[key]);
}

function isBlocked(candidate) {
  return !candidate.checks?.identityVerified || !candidate.checks?.registryChecked || !candidate.checks?.referencesDone;
}

function renderSummary() {
  els.totalCount.textContent = candidates.length;
  els.readyCount.textContent = candidates.filter((candidate) => isComplete(candidate) && candidate.status !== "Godkänd/Certifierad").length;
  els.certifiedCount.textContent = candidates.filter((candidate) => candidate.status === "Godkänd/Certifierad").length;
  els.blockedCount.textContent = candidates.filter(isBlocked).length;
}

function renderTable() {
  els.candidateTableBody.innerHTML = "";
  const rows = filteredCandidates();

  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6">Inga kandidater matchar urvalet.</td>`;
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
    row.addEventListener("click", () => {
      selectedId = candidate.id;
      renderTable();
      renderDetail();
    });
    els.candidateTableBody.append(row);
  }
}

function renderDetail() {
  const candidate = selectedCandidate();

  if (!candidate) {
    els.emptyState.hidden = false;
    els.candidateDetail.hidden = true;
    return;
  }

  els.emptyState.hidden = true;
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
    const item = document.createElement("label");
    item.className = "check-item";
    item.innerHTML = `
      <input type="checkbox" data-check="${key}" ${candidate.checks?.[key] ? "checked" : ""}>
      <span>${label}</span>
    `;
    els.checklist.append(item);
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
  return {
    id: crypto.randomUUID(),
    caseNumber: makeCaseNumber(now),
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

function makeCaseNumber(seed) {
  const value = String(seed || Date.now()).replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `FM-${value}`;
}

function statusClass(candidate) {
  return `status-pill ${isComplete(candidate) ? "ready" : isBlocked(candidate) ? "blocked" : ""}`;
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

els.newCaseButton.addEventListener("click", () => {
  els.candidateForm.hidden = false;
  document.querySelector("#nameInput").focus();
});

els.cancelNewCaseButton.addEventListener("click", () => {
  els.candidateForm.reset();
  els.candidateForm.hidden = true;
});

els.candidateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = newCandidate(new FormData(els.candidateForm));
  await saveCandidate(candidate);
  selectedId = candidate.id;
  els.candidateForm.reset();
  els.candidateForm.hidden = true;
  await refresh();
});

els.searchInput.addEventListener("input", () => {
  searchTerm = els.searchInput.value;
  renderTable();
});

els.statusFilter.addEventListener("change", () => {
  statusFilter = els.statusFilter.value;
  renderTable();
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
});

els.seedButton.addEventListener("click", async () => {
  const now = new Date().toISOString();
  for (const candidate of seedCandidates) {
    const id = crypto.randomUUID();
    await saveCandidate({
      ...candidate,
      id,
      caseNumber: makeCaseNumber(`${now}${id}`),
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

openDatabase()
  .then(async (database) => {
    db = database;
    await refresh();
  })
  .catch((error) => {
    document.body.innerHTML = `<main class="empty-state"><h1>Kunde inte öppna IndexedDB</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
