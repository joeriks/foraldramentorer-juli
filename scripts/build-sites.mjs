import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "dist", "server");
const sourceFiles = [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/index.html", "index.html", "text/html; charset=utf-8"],
  ["/app.js", "app.js", "text/javascript; charset=utf-8"],
  ["/case-domain.js", "case-domain.js", "text/javascript; charset=utf-8"],
  ["/feature-links.js", "feature-links.js", "text/javascript; charset=utf-8"],
  ["/routine-illustrations.js", "routine-illustrations.js", "text/javascript; charset=utf-8"],
  ["/styles.css", "styles.css", "text/css; charset=utf-8"],
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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = assets[url.pathname] || (request.headers.get("accept")?.includes("text/html") ? assets["/"] : null);
    if (!asset) return new Response("Not found", { status: 404 });
    return new Response(request.method === "HEAD" ? null : asset.body, {
      status: 200,
      headers: {
        "content-type": asset.contentType,
        "cache-control": asset.contentType.startsWith("text/html") ? "no-cache" : "public, max-age=3600",
        "x-content-type-options": "nosniff"
      }
    });
  }
};
`;

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "index.js"), worker, "utf8");
