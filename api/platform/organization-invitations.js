import { handleOrganizationInvitation } from "../../supabase-admin-api.js";
import { sendJson, sendWebResponse, toWebRequest } from "../../vercel-http.js";

export default async function organizationInvitations(request, response) {
  try {
    await sendWebResponse(await handleOrganizationInvitation(await toWebRequest(request), process.env), response);
  } catch (error) {
    if (error.message === "REQUEST_TOO_LARGE") {
      sendJson(response, 413, { code: "REQUEST_TOO_LARGE" });
      return;
    }
    sendJson(response, 400, { code: "INVALID_REQUEST" });
  }
}
