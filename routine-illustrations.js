export const ROUTINE_ILLUSTRATIONS = Object.freeze({
  "needs-analysis": {
    kind: "Principillustration",
    title: "Nytt ärende: behovsanalys",
    status: "Utkast",
    featureId: "case.create",
    meta: [["Ärendetyp", "Behovsanalys"], ["Ansvarig enhet", "Familjestöd"], ["Önskat datum", "2026-10-15"]],
    panels: [
      { title: "Minsta registrering", rows: [["Rubrik", "Behov av arabisktalande mentorer"], ["Kort beskrivning", "Efterfrågan överstiger tillgängliga mentorer"], ["Ansvarig", "Sara Lind"]] },
      { title: "Kompletteras vid behov", rows: [["Geografiskt område", "Öster"], ["Önskat antal", "6 mentorer"], ["Analysunderlag", "Inte tillagt"]] }
    ],
    callouts: ["Börja med ett litet antal obligatoriska uppgifter.", "Komplettera samma ärende när mer underlag finns."],
    caption: "Exempel på hur en behovsanalys kan registreras enkelt och senare byggas ut."
  },
  "mentor-registration": {
    kind: "Illustrerad prototypvy",
    title: "Registrera mentor",
    status: "Ny registrering",
    featureId: "mentor.create",
    meta: [["Namn", "Amina Ekström"], ["Kontaktväg", "Telefon"], ["Handläggare", "Ej tilldelad"]],
    panels: [
      { title: "Grunduppgifter", rows: [["Språk", "Svenska, arabiska"], ["Område", "Öster"], ["Tillgänglighet", "Vardagskvällar"]] },
      { title: "Kontroll före registrering", rows: [["Möjliga dubbletter", "Inga säkra träffar"], ["Informationsstatus", "Information lämnad"], ["Ärende om godkännande", "Skapas samtidigt"]] }
    ],
    callouts: ["Dublettkontrollen sker innan posten sparas.", "Mentorposten och ärendet om godkännande hör ihop från start."],
    caption: "Exempel på sammanhållen registrering av en mentorpost och ett ärende om godkännande."
  },
  "certification-case": {
    kind: "Illustrerad prototypvy",
    title: "Godkännande av Amina Ekström",
    status: "Pågår",
    featureId: "cases.list",
    meta: [["Ärende", "FM-4550-387"], ["Ansvarig", "Sara Lind"], ["Nästa steg", "Kontrollera referenser"]],
    panels: [
      { title: "Aktiviteter", rows: [["Verifiera identitet", "Avslutad · Verifierad", "success"], ["Kontrollera registerutdrag", "Avslutad · Godtagbart", "success"], ["Kontrollera referenser", "Pågår", "primary"], ["Genomför intervju", "Ej påbörjad", "muted"]] },
      { title: "Aktuell aktivitet", rows: [["Ansvarig", "Sara Lind"], ["Förfallodatum", "2026-08-18"], ["Underlag", "1 handling"], ["Notering", "Andra kontaktförsöket planerat"]] }
    ],
    callouts: ["Status och resultat visas var för sig.", "Nästa arbetssteg syns både på ärendet och aktiviteten."],
    caption: "Exempel på ett ärende om godkännande där handläggaren snabbt ser nuläge och nästa steg."
  },
  "deviation-assessment": {
    kind: "Principillustration",
    title: "Ställningstagande efter avvikelse",
    status: "Beslut krävs",
    featureId: "cases.list",
    meta: [["Aktivitet", "Kontrollera registerutdrag"], ["Resultat", "Kan inte godtas"], ["Registrerad av", "Sara Lind"]],
    panels: [
      { title: "Bedömningsunderlag", rows: [["Orsakskod", "Krav inte uppfyllt"], ["Notering", "Neutral sammanfattning registrerad"], ["Beslutsfattare", "Ej angiven"]] },
      { title: "Möjliga nästa lägen", rows: [["Fortsätt", "Skapa kompletterande aktivitet", "primary"], ["Pausa", "Ange orsak och bevakningsdatum", "warning"], ["Avsluta", "Ange beslut och avslutsorsak", "danger"]] }
    ],
    callouts: ["Avvikelsen avslutar inte ärendet automatiskt.", "Ett uttryckligt ställningstagande styr nästa läge."],
    caption: "Princip för att skilja aktivitetens resultat från beslutet om hela ärendet."
  },
  "parent-registration": {
    kind: "Principillustration",
    title: "Registrera förälder och stödärende",
    status: "Ny registrering",
    featureId: "parent.create",
    meta: [["Förälder", "Nadia Hassan"], ["Kontaktväg", "Telefon"], ["Ansvarig", "Sara Lind"]],
    panels: [
      { title: "Föräldrapost", rows: [["Namn", "Nadia Hassan"], ["Kontaktuppgift", "Registrerad"], ["Informationsstatus", "Information lämnad"]] },
      { title: "Stödärende FM-S-1042", rows: [["Syfte", "Stöd kring skolfrånvaro"], ["Språk", "Arabiska, svenska"], ["Område", "Öster"], ["Nästa steg", "Förbered matchning", "primary"]] }
    ],
    callouts: ["Stabila personuppgifter ligger på föräldrakortet.", "Varje avgränsat stödbehov får ett eget stödärende."],
    caption: "Exempel på hur en befintlig eller ny förälder kopplas till ett avgränsat stödärende."
  },
  "matching-case": {
    kind: "Principillustration",
    title: "Matcha stödärende med mentor",
    status: "Urval pågår",
    featureId: "matching.list",
    meta: [["Stödärende", "FM-S-1042"], ["Förälder", "Nadia Hassan"], ["Syfte", "Stöd kring skolfrånvaro"]],
    panels: [
      { title: "Hårda kriterier", rows: [["Godkänd", "Ja", "success"], ["Tillgänglig", "Ja", "success"], ["Område", "Öster", "success"]] },
      { title: "Föreslagna mentorer", rows: [["Amina Ekström", "Uppfyller 3 av 3 kriterier", "primary"], ["Leila Rahimi", "Uppfyller 2 av 3 kriterier", "muted"], ["Samira Haddad", "Inte tillgänglig", "warning"]] }
    ],
    callouts: ["Systemet filtrerar endast bland godkända och tillgängliga mentorer.", "Förälderns och mentorns svar registreras var för sig innan matchningen accepteras."],
    caption: "Exempel på hur ett matchningsärende prövar en mentor för ett bestämt stödärende och skiljer automatiskt urval från handläggarens bedömning."
  },
  "assignment-follow-up": {
    kind: "Principillustration",
    title: "Mentoruppdrag och uppföljning",
    status: "Aktivt uppdrag",
    featureId: "assignment.list",
    meta: [["Stödärende", "FM-S-1042"], ["Förälder", "Nadia Hassan"], ["Mentor", "Amina Ekström"], ["Uppdragstid", "2026-09-01–2026-12-15"]],
    panels: [
      { title: "Uppdragsplan", rows: [["Kontakt", "Varje vecka · fysiskt"], ["Föräldraavstämning", "Efter 4 veckor, sedan månadsvis"], ["Rapportfrist", "3 dagar efter kontakt"]] },
      { title: "Period september", rows: [["Mentorrapporter", "4 st · 180 min", "success"], ["Föräldraavstämning", "Kontakt bekräftad · tryggt", "success"], ["Ersättningsunderlag", "Redo för granskning", "primary"]] }
    ],
    callouts: ["Mentorns rapport och handläggarens föräldraavstämning är separata underlag.", "Godkännande fryser rapporter, tid och avstämning för perioden."],
    caption: "Exempel på hur uppdragsplan, mentorrapportering, föräldraavstämning och ersättningsgranskning hålls samman utan att blandas ihop."
  },
  "progressive-registration": {
    kind: "Principillustration",
    title: "Samma ärende från enkelt till strukturerat",
    status: "Samma ärende-ID",
    featureId: "case.create",
    meta: [["Ärende", "FM-2026-0142"], ["Skapat", "2026-08-05"], ["Senast ändrat", "2026-08-07"]],
    panels: [
      { title: "1. Enkel registrering", rows: [["Typ", "Kontakt"], ["Mentor", "Amina Ekström"], ["Rubrik", "Referens går inte att nå"], ["Beskrivning", "Kort notering"]] },
      { title: "2. Kompletterat ärende", rows: [["Aktivitet", "Kontakta mentorn"], ["Ansvarig", "Sara Lind"], ["Förfallodatum", "2026-08-12"], ["Underlag", "Kontaktanteckning"]] }
    ],
    callouts: ["Den enkla registreringen är fullvärdig från början.", "Mer struktur läggs till utan att skapa en ny post."],
    caption: "Princip för progressiv ärendehantering där samma registrering kan kompletteras efter behov."
  },
  "documents-and-meetings": {
    kind: "Principillustration",
    title: "Handlingar, anteckningar och möten",
    status: "Samlat i ärendet",
    featureId: "cases.list",
    meta: [["Ärende", "FM-4550-387"], ["Mentor", "Amina Ekström"], ["Senast ändrat", "2026-08-05"]],
    panels: [
      { title: "Registreringar", rows: [["Möte", "Intervju inför godkännande · 2026-08-02"], ["Tjänsteanteckning", "Referenssamtal · 2026-07-28"], ["Handling", "Intervjuunderlag.pdf"]] },
      { title: "Koppling", rows: [["Ärende", "FM-4550-387"], ["Aktivitet", "Genomför intervju"], ["Version", "1"], ["Registrerad av", "Sara Lind"]] }
    ],
    callouts: ["Objekttypen visar vad registreringen representerar.", "Handlingar kan kopplas till både ärende och relevant aktivitet."],
    caption: "Exempel på hur olika typer av dokumentation hålls samman utan att blandas ihop."
  },
  "handler-handover": {
    kind: "Principillustration",
    title: "Överlämna handläggaransvar",
    status: "Bekräftelse krävs",
    featureId: "admin.handlers",
    meta: [["Ärende", "FM-4550-387"], ["Från", "Sara Lind"], ["Till", "Jonas Berg"]],
    panels: [
      { title: "Ärendeansvar", rows: [["Gäller från", "2026-08-12"], ["Överlämningsnotering", "Pågående referenskontroll"], ["Aktiviteter som följer med", "6 st"]] },
      { title: "Särskilt tilldelade aktiviteter", rows: [["Kontrollera referenser", "Kvar på Maja Holm", "warning"], ["Genomför intervju", "Följer ärendeansvaret", "success"]] }
    ],
    callouts: ["Systemet visar vad som följer med innan bytet bekräftas.", "Särskilda aktivitetstilldelningar ändras inte dolt."],
    caption: "Exempel på en kontrollerad överlämning med tydlig påverkan på aktiviteterna."
  }
});

export function extractRoutineIllustrationIds(markdown) {
  return [...markdown.matchAll(/data-routine-illustration="([a-z0-9-]+)"/g)].map((match) => match[1]);
}
