import { sendJson } from "../vercel-http.js";

export default async function support(request, response) {
  sendJson(
    response,
    request.method === "POST" ? 503 : 405,
    { code: request.method === "POST" ? "AI_NOT_CONFIGURED" : "METHOD_NOT_ALLOWED" }
  );
}
