export const SUPPORT_AREA_CATALOG_VERSION = 1;

export const SUPPORT_AREA_CATEGORIES = [
  { id: "everyday", label: "Vardag och struktur" },
  { id: "school", label: "Skola och lärande" },
  { id: "relationships", label: "Relationer och samspel" },
  { id: "parenting", label: "Föräldrarollen" },
  { id: "community", label: "Samhälle och nätverk" }
];

export const SUPPORT_AREAS = [
  {
    id: "everyday-routines",
    categoryId: "everyday",
    title: "Vardagsrutiner och planering",
    publicDescription: "Få stöd att skapa rutiner, planera veckan och få vardagen att fungera bättre.",
    scopeNote: "Mentorn kan ge praktiskt vardagsstöd men ersätter inte vård eller myndighetsinsatser."
  },
  {
    id: "npf-everyday-support",
    categoryId: "everyday",
    title: "Vardagsstöd vid NPF eller liknande behov",
    publicDescription: "Få stöd med tydlighet, förberedelser och struktur när vardagen kräver extra anpassning.",
    scopeNote: "Diagnos krävs inte. Området avser vardagsstöd, inte bedömning eller behandling."
  },
  {
    id: "life-changes",
    categoryId: "everyday",
    title: "Förändringar och övergångar",
    publicDescription: "Få stöd när vardagen förändras, till exempel vid skolbyte eller nya rutiner.",
    scopeNote: "Mentorn hjälper till med förberedelse och struktur kring förändringen."
  },
  {
    id: "school-absence",
    categoryId: "school",
    title: "Skolfrånvaro och återgång till skolan",
    publicDescription: "Få stöd att skapa rutiner och hålla ihop kontakten kring barnets skolnärvaro.",
    scopeNote: "Mentorn kompletterar men ersätter inte skolans och socialtjänstens ansvar."
  },
  {
    id: "school-contact",
    categoryId: "school",
    title: "Kontakt och samarbete med skolan",
    publicDescription: "Få stöd att förbereda kontakter, möten och överenskommelser med skolan.",
    scopeNote: "Mentorn kan förbereda och följa upp kontakt men företräder inte kommunen eller skolan."
  },
  {
    id: "homework-learning",
    categoryId: "school",
    title: "Läxor, studiero och läranderutiner",
    publicDescription: "Få stöd att skapa fungerande rutiner för läxor, återhämtning och studiero.",
    scopeNote: "Området avser rutiner och motivation, inte specialpedagogisk bedömning."
  },
  {
    id: "parent-child-conflict",
    categoryId: "relationships",
    title: "Konflikter mellan förälder och barn",
    publicDescription: "Få stöd att minska återkommande konflikter och hitta andra sätt att bemöta varandra.",
    scopeNote: "Våld, hot eller akut oro ska hanteras enligt kommunens särskilda skydds- och hänvisningsrutiner."
  },
  {
    id: "communication-listening",
    categoryId: "relationships",
    title: "Kommunikation och lyssnande",
    publicDescription: "Få stöd att prata, lyssna och göra överenskommelser på ett tydligare sätt.",
    scopeNote: "Mentorsstödet tränar vardagligt samspel och ersätter inte behandling."
  },
  {
    id: "siblings",
    categoryId: "relationships",
    title: "Syskonrelationer",
    publicDescription: "Få stöd kring konflikter, rättvisa och rutiner mellan syskon.",
    scopeNote: "Allvarlig oro för ett barns säkerhet ska lämnas vidare enligt fastställd rutin."
  },
  {
    id: "boundaries",
    categoryId: "parenting",
    title: "Gränser och överenskommelser",
    publicDescription: "Få stöd att sätta tydliga gränser och skapa överenskommelser som går att följa.",
    scopeNote: "Mentorn bidrar med erfarenhetsbaserat stöd och fattar inte beslut åt föräldern."
  },
  {
    id: "strong-emotions",
    categoryId: "parenting",
    title: "Starka känslor och återhämtning",
    publicDescription: "Få stöd att behålla lugn, förebygga svåra situationer och hitta återhämtning i vardagen.",
    scopeNote: "Akut psykisk ohälsa och behandlingsbehov ska hänvisas till rätt professionell verksamhet."
  },
  {
    id: "understand-behavior",
    categoryId: "parenting",
    title: "Förstå och bemöta barnets beteende",
    publicDescription: "Få stöd att reflektera över vad som ligger bakom barnets beteende och prova nya bemötanden.",
    scopeNote: "Mentorn ställer inte diagnos och gör inte kliniska bedömningar."
  },
  {
    id: "strengthen-relationship",
    categoryId: "parenting",
    title: "Stärka relationen till barnet",
    publicDescription: "Få stöd att skapa mer positiv tid, närvaro och trygghet tillsammans.",
    scopeNote: "Området avser förebyggande och vardagsnära stöd."
  },
  {
    id: "community-services",
    categoryId: "community",
    title: "Kontakter med samhällsverksamheter",
    publicDescription: "Få stöd att förstå och förbereda kontakter med exempelvis skola, vård eller kommun.",
    scopeNote: "Mentorn kan orientera och förbereda men ger inte juridisk rådgivning och företräder inte myndigheten."
  },
  {
    id: "social-network",
    categoryId: "community",
    title: "Socialt nätverk och aktiviteter",
    publicDescription: "Få stöd att hitta sammanhang, aktiviteter och kontakter som kan stärka förälderns vardag.",
    scopeNote: "Stödet utgår från förälderns önskemål och kommunens lokala utbud."
  }
].map((area, sortOrder) => ({ ...area, version: SUPPORT_AREA_CATALOG_VERSION, sortOrder }));

export const MENTOR_EXPERIENCE_LEVELS = [
  ["lived", "Egen eller närståendes erfarenhet"],
  ["practical", "Erfarenhet av att stödja andra"],
  ["trained", "Utbildning eller yrkeserfarenhet"]
];

export function supportAreaById(id) {
  return SUPPORT_AREAS.find((area) => area.id === id) || null;
}

export function normalizeSupportAreaIds(ids) {
  const valid = new Set(SUPPORT_AREAS.map((area) => area.id));
  return [...new Set(Array.isArray(ids) ? ids : [])].filter((id) => valid.has(id));
}

export function selectedSupportAreas(selections, visibility = "enabled") {
  const byId = new Map((selections || []).map((selection) => [selection.supportAreaId, selection]));
  return SUPPORT_AREAS.filter((area) => {
    const selection = byId.get(area.id);
    if (!selection) return false;
    return visibility === "public" ? selection.enabled && selection.public : selection.enabled;
  });
}

export function supportAreaOverlap(needAreaIds, mentorSupportAreas) {
  const needs = new Set(normalizeSupportAreaIds(needAreaIds));
  const mentorIds = new Set((mentorSupportAreas || []).map((entry) => typeof entry === "string" ? entry : entry.areaId));
  return SUPPORT_AREAS.filter((area) => needs.has(area.id) && mentorIds.has(area.id));
}

export function defaultTenantSupportAreaSelections(tenantId, actorId, now = new Date().toISOString()) {
  return SUPPORT_AREAS.map((area) => ({
    tenantId,
    supportAreaId: area.id,
    catalogVersion: SUPPORT_AREA_CATALOG_VERSION,
    enabled: true,
    public: true,
    updatedAt: now,
    updatedBy: actorId
  }));
}
