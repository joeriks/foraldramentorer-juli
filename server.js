import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  handleOrganizationInvitation,
  handleRuntimeConfiguration
} from "./supabase-admin-api.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

async function webRequest(req, url) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32_768) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  return new Request(url, {
    method: req.method,
    headers: req.headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined
  });
}

async function sendWebResponse(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/runtime-config") {
    await sendWebResponse(res, handleRuntimeConfiguration(await webRequest(req, url), process.env));
    return;
  }
  if (url.pathname === "/api/platform/organization-invitations") {
    try {
      await sendWebResponse(res, await handleOrganizationInvitation(await webRequest(req, url), process.env));
    } catch (error) {
      const status = error.message === "REQUEST_TOO_LARGE" ? 413 : 400;
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ code: error.message === "REQUEST_TOO_LARGE" ? "REQUEST_TOO_LARGE" : "INVALID_REQUEST" }));
    }
    return;
  }
  if (url.pathname === "/api/support") {
    res.writeHead(req.method === "POST" ? 503 : 405, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify({ code: req.method === "POST" ? "AI_NOT_CONFIGURED" : "METHOD_NOT_ALLOWED" }));
    return;
  }
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filename = requestedPath === "/supabase-pilot.js"
    ? "/dist/client/supabase-pilot.js"
    : requestedPath;
  const filePath = path.normalize(path.join(root, filename));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`FöräldraMentorer prototype: http://localhost:${port}`);
});
