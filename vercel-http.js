const BODY_LIMIT_BYTES = 32_768;

function requestUrl(request) {
  const forwardedProtocol = request.headers?.["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol || "https";
  const forwardedHost = request.headers?.["x-forwarded-host"];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || request.headers?.host || "localhost";
  return new URL(request.url || "/", `${protocol}://${host}`);
}

function requestHeaders(request) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers || {})) {
    if (Array.isArray(value)) headers.set(name, value.join(", "));
    else if (value !== undefined) headers.set(name, String(value));
  }
  return headers;
}

async function streamBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > BODY_LIMIT_BYTES) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(value);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function requestBody(request) {
  if (request.body !== undefined && request.body !== null) {
    const body = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(typeof request.body === "string" ? request.body : JSON.stringify(request.body));
    if (body.length > BODY_LIMIT_BYTES) throw new Error("REQUEST_TOO_LARGE");
    return body;
  }
  if (request[Symbol.asyncIterator]) return streamBody(request);
  return undefined;
}

export async function toWebRequest(request) {
  const method = String(request.method || "GET").toUpperCase();
  return new Request(requestUrl(request), {
    method,
    headers: requestHeaders(request),
    body: method === "GET" || method === "HEAD" ? undefined : await requestBody(request)
  });
}

export async function sendWebResponse(response, target) {
  target.statusCode = response.status;
  response.headers.forEach((value, name) => target.setHeader(name, value));
  target.end(Buffer.from(await response.arrayBuffer()));
}

export function sendJson(target, status, value) {
  target.statusCode = status;
  target.setHeader("content-type", "application/json; charset=utf-8");
  target.setHeader("cache-control", "no-store");
  target.setHeader("x-content-type-options", "nosniff");
  target.end(JSON.stringify(value));
}
