import { handleRuntimeConfiguration } from "../supabase-admin-api.js";
import { sendJson, sendWebResponse, toWebRequest } from "../vercel-http.js";

export default async function runtimeConfiguration(request, response) {
  try {
    await sendWebResponse(handleRuntimeConfiguration(await toWebRequest(request), process.env), response);
  } catch {
    sendJson(response, 400, { code: "INVALID_REQUEST" });
  }
}
