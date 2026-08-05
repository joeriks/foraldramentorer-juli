export const FEATURE_LINKS = Object.freeze({
  "dashboard.work-queue": Object.freeze({ href: "#/dashboard" }),
  "cases.list": Object.freeze({ href: "#/cases" }),
  "case.create": Object.freeze({ href: "#/case/new" }),
  "mentor.create": Object.freeze({ href: "#/mentor/new" }),
  "matching.list": Object.freeze({ href: "#/cases/matching" }),
  "assignment.list": Object.freeze({ href: "#/cases/mentor-assignment" }),
  "admin.handlers": Object.freeze({ href: "#/administration" })
});

export const FEATURE_LINK_ALIASES = Object.freeze({});

export function resolveFeatureLink(featureId) {
  const canonicalId = FEATURE_LINK_ALIASES[featureId] || featureId;
  const feature = FEATURE_LINKS[canonicalId];
  return feature ? { ...feature, id: canonicalId } : null;
}

export function extractFeatureLinkIds(markdown) {
  return [...markdown.matchAll(/\]\(feature:([a-z0-9.-]+)\)/g)].map((match) => match[1]);
}
