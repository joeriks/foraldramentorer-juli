const viewButtons = [...document.querySelectorAll("[data-view]")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];

function showView(view) {
  for (const button of viewButtons) {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  for (const panel of viewPanels) panel.hidden = panel.dataset.viewPanel !== view;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

for (const button of viewButtons) button.addEventListener("click", () => showView(button.dataset.view));
for (const button of document.querySelectorAll("[data-go-view]")) button.addEventListener("click", () => showView(button.dataset.goView));

const complexSupportTopics = [
  {
    title: "Vardag med neuropsykiatriska funktionsnedsättningar (NPF) eller behov av extra tydlighet",
    can: "Dela erfarenheter av struktur, tydlighet, energihantering och att förbereda vardagliga förändringar.",
    cannot: "Bedöma eller diagnostisera, rekommendera behandling eller ersätta habilitering, vård eller elevhälsa."
  },
  {
    title: "Långvarig eller återkommande skolfrånvaro",
    can: "Stötta med morgonrutiner, motivation i små steg, förberedelse inför skolmöten och uthållighet över tid.",
    cannot: "Besluta om skolåtgärder, behandla bakomliggande ohälsa eller ta över skolans och elevhälsans ansvar."
  },
  {
    title: "Kontakter med myndigheter och verksamheter",
    can: "Hjälpa föräldern att sortera frågor, förbereda möten, anteckna och följa upp vad som har sagts.",
    cannot: "Ge juridisk rådgivning, fatta beslut, lova insatser eller företräda föräldern utan ett särskilt uppdrag."
  },
  {
    title: "När psykisk eller fysisk ohälsa påverkar vardagen",
    can: "Vara ett medmänskligt extrastöd, bidra till fungerande vardagsrutiner och uppmuntra kontakt med rätt professionell hjälp.",
    cannot: "Bedöma symtom, ge medicinska råd, bedriva behandling eller ansvara för akuta situationer."
  }
];

function scopeGuideMarkup(headingId) {
  return `
  <details class="scope-guide">
    <summary aria-labelledby="${headingId}">
      <span class="scope-summary-copy"><span class="eyebrow">Kompletterande stöd</span><strong id="${headingId}">När familjen också får stöd från vård, skola eller myndigheter</strong><small>NPF, skolfrånvaro, myndighetskontakter eller ohälsa</small></span>
      <span class="scope-summary-action">Visa vad mentorn kan och inte kan göra</span>
    </summary>
    <div class="scope-guide-body">
      <p class="scope-intro">En mentor kan vara ett extra stöd i vardagen samtidigt som familjen får sin huvudsakliga hjälp från exempelvis vården, skolan eller socialtjänsten.</p>
      <div class="scope-topic-list">
        ${complexSupportTopics.map(topic => `
          <article class="scope-topic">
            <h4>${topic.title}</h4>
            <div><strong>Mentorn kan</strong><p>${topic.can}</p></div>
            <div><strong>Mentorn kan inte</strong><p>${topic.cannot}</p></div>
          </article>`).join("")}
      </div>
      <p class="scope-escalation"><strong>Vid akut oro för hälsa eller säkerhet:</strong> kontakta ansvarig professionell aktör eller akut hjälp. Mentorn ska inte ensam hantera situationen.</p>
    </div>
  </details>`;
}

for (const [index, guide] of [...document.querySelectorAll("[data-scope-guide]")].entries()) {
  guide.innerHTML = scopeGuideMarkup(`scopeGuideHeading${index + 1}`);
}

function selectedValues(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function bindLimitedChoices(container, limit, countElement, messageElement, onChange = () => {}) {
  container.addEventListener("change", (event) => {
    const checked = selectedValues(container);
    if (checked.length > limit) {
      event.target.checked = false;
      messageElement.textContent = `Du kan välja högst ${limit} områden.`;
    } else {
      messageElement.textContent = "";
    }
    for (const label of container.querySelectorAll("label")) label.classList.toggle("selected", Boolean(label.querySelector("input:checked")));
    countElement.textContent = String(selectedValues(container).length);
    onChange();
  });
}

const parentAreas = document.querySelector("#parentAreas");
const parentDetails = document.querySelector("#parentDetails");
const parentAreaCount = document.querySelector("#parentAreaCount");
const parentAreaLimit = document.querySelector("#parentAreaLimit");

function renderParentDetails() {
  const selectedInputs = [...parentAreas.querySelectorAll("input:checked")];
  const existing = new Set([...parentDetails.querySelectorAll("input:checked")].map((input) => input.value));
  const details = selectedInputs.flatMap((input) => input.dataset.detail.split("|"));
  parentDetails.innerHTML = details.map((detail, index) => `<label><input type="checkbox" value="${detail}" ${existing.has(detail) || index < 2 ? "checked" : ""}> ${detail}</label>`).join("");
  const compactLabels = selectedInputs.map((input) => input.value.replace("Konflikter, gränser och överenskommelser", "Konflikter och gränser").replace("Skola, skolnärvaro och lärande", "Skola och skolnärvaro"));
  document.querySelector("#coordinatorParentAreas").textContent = compactLabels.join(" · ") || "Inga områden valda";
}

bindLimitedChoices(parentAreas, 3, parentAreaCount, parentAreaLimit, renderParentDetails);
renderParentDetails();

const mentorAreas = document.querySelector("#mentorAreas");
const mentorRows = document.querySelector("#mentorExperienceRows");
const mentorAreaCount = document.querySelector("#mentorAreaCount");
const mentorAreaLimit = document.querySelector("#mentorAreaLimit");

function renderMentorExperienceRows() {
  const selected = selectedValues(mentorAreas);
  const existingProfiles = new Map(
    [...mentorRows.querySelectorAll(".experience-row")].map((row) => [
      row.dataset.area,
      {
        confidence: row.querySelector('.confidence-options input:checked')?.value,
        bases: new Set([...row.querySelectorAll('.experience-bases input:checked')].map((input) => input.value))
      }
    ])
  );
  mentorRows.innerHTML = selected.map((area, index) => `
    <div class="experience-row" data-area="${area}">
      <div class="experience-area"><span>Stödområde</span><strong>${area}</strong></div>
      <fieldset class="support-confidence">
        <legend>Hur trygg känner du dig i att ge stöd?</legend>
        <p>Utgå från vardagliga situationer inom området, inte från professionell rådgivning eller behandling.</p>
        <div class="confidence-options">
          <label>
            <input type="radio" name="mentor-confidence-${index}" value="Viss trygghet" ${existingProfiles.get(area)?.confidence === "Viss trygghet" ? "checked" : ""}>
            <span><strong>Viss trygghet</strong><small>Jag kan ge stöd i tydliga och avgränsade vardagssituationer.</small></span>
          </label>
          <label>
            <input type="radio" name="mentor-confidence-${index}" value="God trygghet" ${existingProfiles.get(area)?.confidence === "God trygghet" || (!existingProfiles.has(area) && index === 1) ? "checked" : ""}>
            <span><strong>God trygghet</strong><small>Jag känner mig trygg att ge stöd i flera vanliga situationer inom området.</small></span>
          </label>
          <label>
            <input type="radio" name="mentor-confidence-${index}" value="Mycket god trygghet" ${existingProfiles.get(area)?.confidence === "Mycket god trygghet" || (!existingProfiles.has(area) && index !== 1) ? "checked" : ""}>
            <span><strong>Mycket god trygghet</strong><small>Jag känner mig trygg även när vardagssituationen är mer sammansatt, inom mentorskapets gränser.</small></span>
          </label>
        </div>
      </fieldset>
      <fieldset class="experience-bases">
        <legend>Vad bygger du din bedömning på? <span>Kompletterande uppgift</span></legend>
        <label><input type="checkbox" value="Egen erfarenhet eller erfarenhet som närstående" ${existingProfiles.get(area)?.bases.has("Egen erfarenhet eller erfarenhet som närstående") || (!existingProfiles.has(area) && index !== 2) ? "checked" : ""}> Egen erfarenhet eller erfarenhet som närstående</label>
        <label><input type="checkbox" value="Erfarenhet av att ge vardagsnära stöd till andra" ${existingProfiles.get(area)?.bases.has("Erfarenhet av att ge vardagsnära stöd till andra") || (!existingProfiles.has(area) && (index === 1 || index === 2)) ? "checked" : ""}> Erfarenhet av att ge vardagsnära stöd till andra</label>
        <label><input type="checkbox" value="Utbildning eller yrkeserfarenhet" ${existingProfiles.get(area)?.bases.has("Utbildning eller yrkeserfarenhet") ? "checked" : ""}> Utbildning eller yrkeserfarenhet</label>
      </fieldset>
    </div>`).join("");
}

bindLimitedChoices(mentorAreas, 5, mentorAreaCount, mentorAreaLimit, renderMentorExperienceRows);
renderMentorExperienceRows();

for (const candidate of document.querySelectorAll(".candidate-row")) {
  candidate.addEventListener("change", () => {
    for (const row of document.querySelectorAll(".candidate-row")) row.classList.toggle("selected", Boolean(row.querySelector("input:checked")));
    document.querySelector("#assessmentHeading").textContent = candidate.querySelector(".candidate-main strong").textContent;
    document.querySelector("#continueWithMentor").textContent = `Fortsätt med ${candidate.querySelector(".candidate-main strong").textContent}`;
  });
}
