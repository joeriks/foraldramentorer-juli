export const FEATURE_LINKS = Object.freeze({
  "dashboard.work-queue": Object.freeze({ href: "#/dashboard" }),
  "calendar.view": Object.freeze({ href: "#/calendar" }),
  "intake.list": Object.freeze({ href: "#/intake" }),
  "cases.list": Object.freeze({ href: "#/cases" }),
  "case.create": Object.freeze({ href: "#/case/new" }),
  "case.edit": Object.freeze({ href: "#/case/:caseId/edit/:activityId" }),
  "case.matching": Object.freeze({ href: "#/case/:caseId/matching/:activityId" }),
  "case.meetings": Object.freeze({ href: "#/case/:caseId/meetings/:activityId" }),
  "case.assignment-followup": Object.freeze({ href: "#/case/:caseId/assignment-followup/:activityId" }),
  "case.activity": Object.freeze({ href: "#/case/:caseId/activities/:activityId" }),
  "mentor.list": Object.freeze({ href: "#/mentors" }),
  "mentor.create": Object.freeze({ href: "#/mentor/new" }),
  "mentor.identity": Object.freeze({ href: "#/mentor/:mentorId/identity/:caseId/:activityId" }),
  "parent.list": Object.freeze({ href: "#/parents" }),
  "parent.create": Object.freeze({ href: "#/parent/new" }),
  "matching.list": Object.freeze({ href: "#/cases/matching" }),
  "assignment.list": Object.freeze({ href: "#/cases/mentor-assignment" }),
  "admin.handlers": Object.freeze({ href: "#/administration" }),
  "admin.case-types": Object.freeze({ href: "#/case-types" }),
  "admin.support-areas": Object.freeze({ href: "#/support-areas" }),
  "admin.support": Object.freeze({ href: "#/support-admin" }),
  "admin.demo": Object.freeze({ href: "#/presentation" }),
  "learning.library": Object.freeze({ href: "#/learning" }),
  "admin.learning": Object.freeze({ href: "#/learning-admin" }),
  "public.home": Object.freeze({ href: "#/public-home" }),
  "routines.view": Object.freeze({ href: "#/routines" })
});

export const FEATURE_LINK_ALIASES = Object.freeze({});

export function resolveFeatureLink(featureId) {
  const canonicalId = FEATURE_LINK_ALIASES[featureId] || featureId;
  const feature = FEATURE_LINKS[canonicalId];
  return feature ? { ...feature, id: canonicalId } : null;
}

export function resolveFeatureRoute(featureId, parameters = {}) {
  const feature = resolveFeatureLink(featureId);
  if (!feature) return null;
  const href = feature.href.replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, (match, key) => {
    const value = parameters[key];
    return value === undefined || value === null || value === "" ? match : encodeURIComponent(String(value));
  });
  return href.includes(":") ? null : href;
}

export function extractFeatureLinkIds(markdown) {
  return [...markdown.matchAll(/\]\(feature:([a-z0-9.-]+)\)/g)].map((match) => match[1]);
}

export function routineSectionKey(headingText, fallbackIndex = 0) {
  const text = headingText.trim();
  const numbered = text.match(/^(\d+(?:\.\d+)*)(?:\.|\s|:|$)/);
  if (numbered) return numbered[1].replaceAll(".", "-");

  const appendix = text.match(/^([A-Z])\.(\d+)(?:\.|\s|:|$)/);
  if (appendix) return `${appendix[1].toLowerCase()}-${appendix[2]}`;

  const appendixHeading = text.match(/^Bilaga\s+([A-Z])(?:\s|:|$)/i);
  if (appendixHeading) return `bilaga-${appendixHeading[1].toLowerCase()}`;

  const scenario = text.match(/^Scenario\s+(\d+)(?:\s|:|$)/i);
  if (scenario) return `scenario-${scenario[1]}`;

  const slug = text
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `avsnitt-${fallbackIndex + 1}`;
}

export function routineSectionRoute(sectionKey = "") {
  return sectionKey ? `#/routines/${sectionKey}` : "#/routines";
}
