import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "dist", "server");
const sourceFiles = [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/index.html", "index.html", "text/html; charset=utf-8"],
  ["/app.js", "app.js", "text/javascript; charset=utf-8"],
  ["/calendar-domain.js", "calendar-domain.js", "text/javascript; charset=utf-8"],
  ["/interaction-domain.js", "interaction-domain.js", "text/javascript; charset=utf-8"],
  ["/support-area-domain.js", "support-area-domain.js", "text/javascript; charset=utf-8"],
  ["/matching-profile-domain.js", "matching-profile-domain.js", "text/javascript; charset=utf-8"],
  ["/matching-catalog-domain.js", "matching-catalog-domain.js", "text/javascript; charset=utf-8"],
  ["/learning-domain.js", "learning-domain.js", "text/javascript; charset=utf-8"],
  ["/support-domain.js", "support-domain.js", "text/javascript; charset=utf-8"],
  ["/case-domain.js", "case-domain.js", "text/javascript; charset=utf-8"],
  ["/feature-links.js", "feature-links.js", "text/javascript; charset=utf-8"],
  ["/routine-illustrations.js", "routine-illustrations.js", "text/javascript; charset=utf-8"],
  ["/styles.css", "styles.css", "text/css; charset=utf-8"],
  ["/prototypes/matchningsunderlag.html", "prototypes/matchningsunderlag.html", "text/html; charset=utf-8"],
  ["/prototypes/matchningsunderlag.css", "prototypes/matchningsunderlag.css", "text/css; charset=utf-8"],
  ["/prototypes/matchningsunderlag.js", "prototypes/matchningsunderlag.js", "text/javascript; charset=utf-8"],
  ["/docs/verksamhetsfloden-och-handlaggningsrutiner.md", "docs/verksamhetsfloden-och-handlaggningsrutiner.md", "text/markdown; charset=utf-8"],
  ["/vendor/bootstrap/bootstrap.min.css", "vendor/bootstrap/bootstrap.min.css", "text/css; charset=utf-8"],
  ["/vendor/bootstrap/bootstrap.bundle.min.js", "vendor/bootstrap/bootstrap.bundle.min.js", "text/javascript; charset=utf-8"],
  ["/vendor/marked/marked.esm.js", "vendor/marked/marked.esm.js", "text/javascript; charset=utf-8"]
];

const assets = {};
for (const [pathname, filename, contentType] of sourceFiles) {
  assets[pathname] = {
    body: await readFile(resolve(root, filename), "utf8"),
    contentType
  };
}

const worker = `const assets = ${JSON.stringify(assets)};

const sensitivePattern = /\\b(?:19|20)?\\d{6}[-+]?\\d{4}\\b/;

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}

async function handleSupport(request, env) {
  if (!env?.OPENAI_API_KEY) return jsonResponse({ code: "AI_NOT_CONFIGURED" }, 503);
  let payload;
  try { payload = await request.json(); } catch { return jsonResponse({ code: "INVALID_JSON" }, 400); }
  const question = String(payload?.question || "").trim();
  if (!question || question.length > 2000) return jsonResponse({ code: "INVALID_QUESTION" }, 400);
  if (sensitivePattern.test(question)) return jsonResponse({ code: "SENSITIVE_DATA" }, 400);
  const context = {
    role: String(payload?.context?.role || "Okänd"),
    view: String(payload?.context?.view || "Okänd"),
    route: String(payload?.context?.route || "")
  };
  const knowledge = Array.isArray(payload?.knowledge) ? payload.knowledge.slice(0, 3).map((item) => ({
    title: String(item?.title || ""), answer: String(item?.answer || "").slice(0, 1200), href: String(item?.href || "")
  })) : [];
  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "authorization": "Bearer " + env.OPENAI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_SUPPORT_MODEL || "gpt-5.6-terra",
      store: false,
      max_output_tokens: 700,
      reasoning: { effort: "medium" },
      text: { verbosity: "low" },
      instructions: "Du är systemsupport för FöräldraMentorer, en svensk kommunal prototyp. Svara direkt på den ställda frågan, kort och konkret på svenska. Referensmaterialet är sorterat med mest relevant post först: använd den första posten som primär källa och blanda inte in andra arbetsflöden om de inte behövs. Vid en hur-gör-jag-fråga ska svaret ange den exakta menyn eller knappen och ge 2-5 tydliga steg. Använd endast referensmaterialet. Om materialet inte räcker ska du säga det och sätta needsHuman till true. Hitta aldrig på genomförda registreringar eller regler. Be aldrig om personnummer, registeruppgifter eller känsliga personuppgifter. Klassificera som how_to, bug_report, feature_request, privacy_or_security eller general. Vid fel, osäkerhet, integritet eller utvecklingsförslag ska needsHuman vara true. Returnera endast JSON med answer, category, needsHuman och sources (array med title och href från referensmaterialet).",
      input: JSON.stringify({ question, context, referenceMaterial: knowledge })
    })
  });
  if (!upstream.ok) return jsonResponse({ code: "AI_UNAVAILABLE" }, 502);
  const result = await upstream.json();
  const outputText = (result.output || []).flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
  try {
    const clean = outputText.replace(/^\\s*\`\`\`(?:json)?/i, "").replace(/\`\`\`\\s*$/, "").trim();
    const answer = JSON.parse(clean);
    return jsonResponse({
      answer: String(answer.answer || "").slice(0, 3000),
      category: String(answer.category || "general"),
      needsHuman: Boolean(answer.needsHuman),
      sources: Array.isArray(answer.sources) ? answer.sources.slice(0, 3) : knowledge.slice(0, 2)
    });
  } catch {
    return jsonResponse({ answer: outputText.slice(0, 3000), category: "general", needsHuman: true, sources: knowledge.slice(0, 2) });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/support") {
      if (request.method !== "POST") return jsonResponse({ code: "METHOD_NOT_ALLOWED" }, 405);
      return handleSupport(request, env);
    }
    const asset = assets[url.pathname] || (request.headers.get("accept")?.includes("text/html") ? assets["/"] : null);
    if (!asset) return new Response("Not found", { status: 404 });
    const cacheControl = url.pathname.startsWith("/vendor/") ? "public, max-age=3600" : "no-cache";
    return new Response(request.method === "HEAD" ? null : asset.body, {
      status: 200,
      headers: { "content-type": asset.contentType, "cache-control": cacheControl, "x-content-type-options": "nosniff" }
    });
  }
};
`;

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "index.js"), worker, "utf8");
