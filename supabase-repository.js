function resultOrThrow(result, operation) {
  if (result?.error) {
    const error = new Error(`${operation}: ${result.error.message || result.error.code || "okänt fel"}`);
    error.cause = result.error;
    throw error;
  }
  return result?.data;
}

export class VersionConflictError extends Error {
  constructor(message, { cause, currentVersion = null } = {}) {
    super(message);
    this.name = "VersionConflictError";
    this.code = "VERSION_CONFLICT";
    this.currentVersion = currentVersion;
    this.cause = cause;
  }
}

function currentVersionFromError(error) {
  const match = String(error?.message || "").match(/current\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function versionedResultOrThrow(result, operation, conflictMessage) {
  if (result?.error?.code === "40001") {
    throw new VersionConflictError(conflictMessage, {
      cause: result.error,
      currentVersion: currentVersionFromError(result.error)
    });
  }
  return resultOrThrow(result, operation);
}

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

function normalizedActivityResults(results) {
  if (!Array.isArray(results) || results.length < 1 || results.length > 20) {
    throw new TypeError("Mellan 1 och 20 aktivitetsresultat krävs");
  }

  const normalized = results.map((result, index) => {
    const code = String(result?.code || "").trim();
    const label = String(result?.label || "").trim();
    const classification = String(result?.classification || "").trim().toLowerCase();
    const sortOrder = result?.sortOrder ?? (index + 1) * 10;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) throw new TypeError("Resultatkoder ska vara kebab-case");
    if (!label) throw new TypeError("Varje aktivitetsresultat behöver en etikett");
    if (!["accepted", "deviation"].includes(classification)) throw new TypeError("Ogiltig resultatklassificering");
    if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new TypeError("Giltig sorteringsordning krävs");
    return { code, label, classification, sort_order: sortOrder };
  });

  if (new Set(normalized.map((result) => result.code)).size !== normalized.length) {
    throw new TypeError("Resultatkoder måste vara unika");
  }
  if (new Set(normalized.map((result) => result.sort_order)).size !== normalized.length) {
    throw new TypeError("Resultatens sorteringsordning måste vara unik");
  }
  return normalized;
}

export function createSupabaseRepository(client) {
  if (!client) throw new TypeError("Supabase-klient krävs");

  return {
    async getSessionContext() {
      return resultOrThrow(await client.rpc("current_session_context"), "Kunde inte läsa sessionskontext");
    },

    async listCases({ limit = 50 } = {}) {
      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
      const result = await client
        .from("cases")
        .select("id,number,case_type_id,title,description,status,priority,version,mentor_id,parent_id,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(safeLimit);
      return resultOrThrow(result, "Kunde inte läsa ärenden") || [];
    },

    async listActivityDefinitions() {
      const [definitionsResult, versionsResult, resultsResult, eventsResult] = await Promise.all([
        client
          .from("activity_definitions")
          .select("id,stable_key,status,is_default,current_version,created_at,updated_at")
          .order("stable_key", { ascending: true }),
        client
          .from("activity_definition_versions")
          .select("activity_definition_id,version,title,description,status,created_at,published_at,published_by")
          .order("version", { ascending: false }),
        client
          .from("activity_result_definitions")
          .select("activity_definition_id,activity_definition_version,code,label,classification,sort_order")
          .order("sort_order", { ascending: true }),
        client
          .from("activity_definition_events")
          .select("id,activity_definition_id,activity_definition_version,event_type,occurred_at,reason,payload")
          .order("occurred_at", { ascending: false })
          .limit(100)
      ]);

      return {
        definitions: resultOrThrow(definitionsResult, "Kunde inte läsa aktivitetsdefinitioner") || [],
        versions: resultOrThrow(versionsResult, "Kunde inte läsa definitionsversioner") || [],
        results: resultOrThrow(resultsResult, "Kunde inte läsa resultatkataloger") || [],
        events: resultOrThrow(eventsResult, "Kunde inte läsa definitionshistorik") || []
      };
    },

    async publishActivityDefinition({
      activityDefinitionId = null,
      expectedCurrentVersion = null,
      stableKey,
      title,
      description = "",
      results,
      reason,
      idempotencyKey
    }) {
      const normalizedStableKey = String(stableKey || "").trim();
      const normalizedTitle = String(title || "").trim();
      const normalizedReason = String(reason || "").trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedStableKey)) throw new TypeError("Stabil nyckel ska vara kebab-case");
      if (!normalizedTitle) throw new TypeError("Definitionens titel krävs");
      if (!normalizedReason) throw new TypeError("Skäl för publiceringen krävs");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");
      if (activityDefinitionId && (!Number.isInteger(expectedCurrentVersion) || expectedCurrentVersion < 1)) {
        throw new TypeError("Giltig aktuell definitionsversion krävs");
      }
      if (!activityDefinitionId && expectedCurrentVersion !== null) {
        throw new TypeError("En ny definition kan inte ha en tidigare version");
      }

      const result = await client.rpc("publish_activity_definition", {
        p_activity_definition_id: activityDefinitionId,
        p_expected_current_version: expectedCurrentVersion,
        p_stable_key: normalizedStableKey,
        p_title: normalizedTitle,
        p_description: String(description || ""),
        p_results: normalizedActivityResults(results),
        p_reason: normalizedReason,
        p_idempotency_key: String(idempotencyKey).trim()
      });

      if (result?.error?.code === "40001") {
        throw new VersionConflictError("Aktivitetsdefinitionen har publicerats av en annan användare.", {
          cause: result.error,
          currentVersion: currentVersionFromError(result.error)
        });
      }

      return resultOrThrow(result, "Kunde inte publicera aktivitetsdefinitionen");
    },

    async createCaseActivity({
      caseId,
      activityDefinitionId,
      expectedActivityDefinitionVersion,
      title,
      dueDate = null,
      idempotencyKey
    }) {
      if (!caseId) throw new TypeError("Ärende-id krävs");
      if (!activityDefinitionId) throw new TypeError("Aktivitetsdefinition krävs");
      if (!Number.isInteger(expectedActivityDefinitionVersion) || expectedActivityDefinitionVersion < 1) {
        throw new TypeError("Giltig publicerad definitionsversion krävs");
      }
      const normalizedTitle = String(title || "").trim();
      if (!normalizedTitle || normalizedTitle.length > 160) throw new TypeError("Aktivitetsrubriken måste vara 1–160 tecken");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");

      const result = await client.rpc("create_case_activity", {
        p_case_id: caseId,
        p_activity_definition_id: activityDefinitionId,
        p_expected_activity_definition_version: expectedActivityDefinitionVersion,
        p_title: normalizedTitle,
        p_due_date: dueDate || null,
        p_idempotency_key: String(idempotencyKey).trim()
      });

      return versionedResultOrThrow(
        result,
        "Kunde inte skapa aktiviteten",
        "Aktivitetsdefinitionen har ändrats av en annan användare."
      );
    },

    async getCaseWorkspace(caseId) {
      if (!caseId) throw new TypeError("Ärende-id krävs");
      const [
        caseResult,
        assignmentsResult,
        activitiesResult,
        resultsResult,
        eventsResult,
        descriptionsResult,
        notesResult,
        deviationsResult,
        documentsResult
      ] = await Promise.all([
        client
          .from("cases")
          .select("id,number,case_type_id,title,description,status,priority,version,mentor_id,parent_id,created_at,updated_at")
          .eq("id", caseId)
          .single(),
        client
          .from("case_assignments")
          .select("id,user_id,role,version,assigned_at,ended_at")
          .eq("case_id", caseId)
          .order("assigned_at", { ascending: false }),
        client
          .from("case_activities")
          .select("id,title,status,result_code,classification,activity_definition_id,activity_definition_version,due_date,waiting_for_party,sort_order,version,updated_at")
          .eq("case_id", caseId)
          .order("sort_order", { ascending: true }),
        client
          .from("activity_result_definitions")
          .select("activity_definition_id,activity_definition_version,code,label,classification,sort_order")
          .order("sort_order", { ascending: true }),
        client
          .from("case_events")
          .select("id,type,entity_type,occurred_at,payload")
          .eq("case_id", caseId)
          .order("occurred_at", { ascending: false })
          .limit(100),
        client
          .from("case_description_versions")
          .select("id,version,text,created_at,created_by")
          .eq("case_id", caseId)
          .order("version", { ascending: false }),
        client
          .from("case_notes")
          .select("id,note_id,target_type,target_id,text,version,supersedes_version_id,created_at,created_by")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
        client
          .from("activity_deviations")
          .select("id,activity_id,result_code,status,version,opened_at,opened_by,resolved_at,resolved_by,active_decision_id")
          .eq("case_id", caseId)
          .order("opened_at", { ascending: false }),
        client
          .from("documents")
          .select("id,title,category,status,current_version,created_at,created_by,updated_at")
          .eq("case_id", caseId)
          .order("updated_at", { ascending: false })
      ]);

      const deviations = resultOrThrow(deviationsResult, "Kunde inte läsa avvikelser") || [];
      const documents = resultOrThrow(documentsResult, "Kunde inte läsa dokument") || [];
      const [decisionsResult, documentVersionsResult] = await Promise.all([
        deviations.length
          ? client
            .from("deviation_decisions")
            .select("id,deviation_id,outcome,reason_code,note,resume_at,supersedes_decision_id,decided_at,decided_by")
            .in("deviation_id", deviations.map((deviation) => deviation.id))
            .order("decided_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        documents.length
          ? client
            .from("document_versions")
            .select("id,document_id,version,storage_bucket,storage_object_path,file_name,mime_type,expected_size_bytes,actual_size_bytes,status,created_at,completed_at")
            .in("document_id", documents.map((document) => document.id))
            .order("version", { ascending: false })
          : Promise.resolve({ data: [], error: null })
      ]);

      return {
        case: resultOrThrow(caseResult, "Kunde inte läsa ärendet"),
        assignments: resultOrThrow(assignmentsResult, "Kunde inte läsa ansvar") || [],
        activities: resultOrThrow(activitiesResult, "Kunde inte läsa aktiviteter") || [],
        activityResults: resultOrThrow(resultsResult, "Kunde inte läsa aktivitetsresultat") || [],
        events: resultOrThrow(eventsResult, "Kunde inte läsa historik") || [],
        descriptionVersions: resultOrThrow(descriptionsResult, "Kunde inte läsa beskrivningshistorik") || [],
        notes: resultOrThrow(notesResult, "Kunde inte läsa anteckningar") || [],
        deviations,
        deviationDecisions: resultOrThrow(decisionsResult, "Kunde inte läsa avvikelsebeslut") || [],
        documents,
        documentVersions: resultOrThrow(documentVersionsResult, "Kunde inte läsa dokumentversioner") || []
      };
    },

    async updateCaseDescription({ caseId, expectedCaseVersion, text, idempotencyKey }) {
      if (!caseId) throw new TypeError("Ärende-id krävs");
      if (!Number.isInteger(expectedCaseVersion) || expectedCaseVersion < 1) throw new TypeError("Giltig ärendeversion krävs");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");
      const result = await client.rpc("update_case_description", {
        p_case_id: caseId,
        p_expected_case_version: expectedCaseVersion,
        p_text: String(text || ""),
        p_idempotency_key: String(idempotencyKey).trim()
      });
      return versionedResultOrThrow(
        result,
        "Kunde inte uppdatera ärendebeskrivningen",
        "Ärendet har ändrats av en annan användare."
      );
    },

    async saveCaseNote({
      caseId,
      expectedCaseVersion,
      noteId = null,
      targetType = "case",
      targetId = null,
      text,
      supersedesVersionId = null,
      idempotencyKey
    }) {
      const normalizedTargetType = String(targetType || "").trim().toLowerCase();
      if (!caseId) throw new TypeError("Ärende-id krävs");
      if (!Number.isInteger(expectedCaseVersion) || expectedCaseVersion < 1) throw new TypeError("Giltig ärendeversion krävs");
      if (!["case", "activity"].includes(normalizedTargetType)) throw new TypeError("Ogiltig anteckningskoppling");
      if ((normalizedTargetType === "case" && targetId) || (normalizedTargetType === "activity" && !targetId)) {
        throw new TypeError("Anteckningskopplingen är ofullständig");
      }
      if (!String(text || "").trim()) throw new TypeError("Anteckningstext krävs");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");
      const result = await client.rpc("save_case_note", {
        p_case_id: caseId,
        p_expected_case_version: expectedCaseVersion,
        p_note_id: noteId,
        p_target_type: normalizedTargetType,
        p_target_id: targetId,
        p_text: String(text).trim(),
        p_supersedes_version_id: supersedesVersionId,
        p_idempotency_key: String(idempotencyKey).trim()
      });
      return versionedResultOrThrow(
        result,
        "Kunde inte spara ärendeanteckningen",
        "Ärendet eller anteckningen har ändrats av en annan användare."
      );
    },

    async decideActivityDeviation({
      deviationId,
      expectedDeviationVersion,
      expectedCaseVersion,
      outcome,
      reasonCode,
      note,
      resumeAt = null,
      followUpTitle = null,
      idempotencyKey
    }) {
      const normalizedOutcome = String(outcome || "").trim().toLowerCase();
      if (!deviationId) throw new TypeError("Avvikelse-id krävs");
      if (!Number.isInteger(expectedDeviationVersion) || expectedDeviationVersion < 1) throw new TypeError("Giltig avvikelseversion krävs");
      if (!Number.isInteger(expectedCaseVersion) || expectedCaseVersion < 1) throw new TypeError("Giltig ärendeversion krävs");
      if (!["continue", "request_supplement", "pause_case", "close_case"].includes(normalizedOutcome)) throw new TypeError("Ogiltigt ställningstagande");
      if (!String(reasonCode || "").trim() || !String(note || "").trim()) throw new TypeError("Orsak och motivering krävs");
      if (normalizedOutcome === "request_supplement" && !String(followUpTitle || "").trim()) {
        throw new TypeError("Rubrik för uppföljningsaktiviteten krävs");
      }
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");
      const result = await client.rpc("decide_activity_deviation", {
        p_deviation_id: deviationId,
        p_expected_deviation_version: expectedDeviationVersion,
        p_expected_case_version: expectedCaseVersion,
        p_outcome: normalizedOutcome,
        p_reason_code: String(reasonCode).trim(),
        p_note: String(note).trim(),
        p_resume_at: resumeAt || null,
        p_follow_up_title: String(followUpTitle || "").trim() || null,
        p_idempotency_key: String(idempotencyKey).trim()
      });
      return versionedResultOrThrow(
        result,
        "Kunde inte registrera ställningstagandet",
        "Ärendet eller avvikelsen har ändrats av en annan användare."
      );
    },

    async uploadCaseDocument({ caseId, title, category = "case_attachment", file, idempotencyKey }) {
      if (!caseId) throw new TypeError("Ärende-id krävs");
      if (!String(title || "").trim()) throw new TypeError("Dokumenttitel krävs");
      if (!file || !Number.isInteger(file.size) || file.size < 1 || file.size > 20 * 1024 * 1024) {
        throw new TypeError("Dokumentet måste vara mellan 1 byte och 20 MiB");
      }
      if (!DOCUMENT_MIME_TYPES.has(String(file.type || "").toLowerCase())) throw new TypeError("Filtypen stöds inte");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");

      const reservation = resultOrThrow(await client.rpc("create_document_upload", {
        p_title: String(title).trim(),
        p_category: String(category || "case_attachment").trim(),
        p_case_id: caseId,
        p_mentor_id: null,
        p_parent_id: null,
        p_file_name: String(file.name || "document").trim(),
        p_mime_type: String(file.type).toLowerCase(),
        p_expected_size_bytes: file.size,
        p_idempotency_key: String(idempotencyKey).trim()
      }), "Kunde inte reservera dokumentuppladdningen");

      resultOrThrow(await client.storage
        .from(reservation.storage_bucket)
        .upload(reservation.storage_object_path, file, {
          contentType: reservation.mime_type,
          upsert: false
        }), "Kunde inte ladda upp dokumentet");

      return resultOrThrow(await client.rpc("complete_document_upload", {
        p_document_version_id: reservation.id,
        p_idempotency_key: `${String(idempotencyKey).trim()}:complete`
      }), "Kunde inte slutföra dokumentuppladdningen");
    },

    async transitionCaseActivityWorkState({
      activityId,
      expectedVersion,
      targetStatus,
      waitingForParty = null,
      dueDate = null,
      reason = null,
      idempotencyKey
    }) {
      if (!activityId) throw new TypeError("Aktivitets-id krävs");
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new TypeError("Giltig aktivitetsversion krävs");
      const normalizedTargetStatus = String(targetStatus || "").trim().toLowerCase();
      const normalizedWaitingForParty = String(waitingForParty || "").trim().toLowerCase() || null;
      const normalizedReason = String(reason || "").trim() || null;
      if (!["active", "waiting"].includes(normalizedTargetStatus)) throw new TypeError("Ogiltigt arbetsläge för aktiviteten");
      if (normalizedTargetStatus === "waiting" && !["mentor", "handler", "external"].includes(normalizedWaitingForParty)) {
        throw new TypeError("Ange vem eller vad aktiviteten väntar på");
      }
      if (normalizedTargetStatus === "waiting" && !normalizedReason) throw new TypeError("Motivering krävs för vänteläge");
      if (normalizedReason && normalizedReason.length > 2000) throw new TypeError("Motiveringen får vara högst 2000 tecken");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");

      const result = await client.rpc("transition_case_activity_work_state", {
        p_activity_id: activityId,
        p_expected_version: expectedVersion,
        p_target_status: normalizedTargetStatus,
        p_waiting_for_party: normalizedTargetStatus === "waiting" ? normalizedWaitingForParty : null,
        p_due_date: dueDate || null,
        p_reason: normalizedReason,
        p_idempotency_key: String(idempotencyKey).trim()
      });

      return versionedResultOrThrow(
        result,
        "Kunde inte uppdatera aktivitetens arbetsläge",
        "Aktiviteten har ändrats av en annan användare."
      );
    },

    async reopenCaseActivity({ activityId, expectedVersion, reason, idempotencyKey }) {
      if (!activityId) throw new TypeError("Aktivitets-id krävs");
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new TypeError("Giltig aktivitetsversion krävs");
      const normalizedReason = String(reason || "").trim();
      if (!normalizedReason || normalizedReason.length > 2000) throw new TypeError("Motivering på 1–2000 tecken krävs för återöppning");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");

      const result = await client.rpc("reopen_case_activity", {
        p_activity_id: activityId,
        p_expected_version: expectedVersion,
        p_reason: normalizedReason,
        p_idempotency_key: String(idempotencyKey).trim()
      });

      return versionedResultOrThrow(
        result,
        "Kunde inte återöppna aktiviteten",
        "Aktiviteten har ändrats av en annan användare."
      );
    },

    async transitionCaseLifecycle({
      caseId,
      expectedVersion,
      action,
      reasonCode,
      note,
      resumeAt = null,
      idempotencyKey
    }) {
      if (!caseId) throw new TypeError("Ärende-id krävs");
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new TypeError("Giltig ärendeversion krävs");
      const normalizedAction = String(action || "").trim().toLowerCase();
      const normalizedReasonCode = String(reasonCode || "").trim().toLowerCase();
      const normalizedNote = String(note || "").trim();
      if (!["pause", "resume", "close", "reopen"].includes(normalizedAction)) throw new TypeError("Ogiltig ärendeövergång");
      if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(normalizedReasonCode) || normalizedReasonCode.length > 120) {
        throw new TypeError("Giltig strukturerad orsak krävs");
      }
      if (!normalizedNote || normalizedNote.length > 4000) throw new TypeError("Motivering på 1–4000 tecken krävs");
      if (normalizedAction !== "pause" && resumeAt) throw new TypeError("Bevakningsdatum får endast anges vid paus");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");

      const result = await client.rpc("transition_case_lifecycle", {
        p_case_id: caseId,
        p_expected_version: expectedVersion,
        p_action: normalizedAction,
        p_reason_code: normalizedReasonCode,
        p_note: normalizedNote,
        p_resume_at: normalizedAction === "pause" ? resumeAt || null : null,
        p_idempotency_key: String(idempotencyKey).trim()
      });

      return versionedResultOrThrow(
        result,
        "Kunde inte ändra ärendets livscykel",
        "Ärendet har ändrats av en annan användare."
      );
    },

    async completeCaseActivity({
      activityId,
      expectedVersion,
      resultCode,
      classification = null,
      idempotencyKey
    }) {
      if (!activityId) throw new TypeError("Aktivitets-id krävs");
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new TypeError("Giltig aktivitetsversion krävs");
      if (!String(resultCode || "").trim()) throw new TypeError("Aktivitetsresultat krävs");
      if (!String(idempotencyKey || "").trim()) throw new TypeError("Idempotensnyckel krävs");

      const result = await client.rpc("complete_case_activity", {
        p_activity_id: activityId,
        p_expected_version: expectedVersion,
        p_result_code: String(resultCode).trim(),
        p_classification: String(classification || "").trim() || null,
        p_idempotency_key: String(idempotencyKey).trim()
      });

      if (result?.error?.code === "40001") {
        throw new VersionConflictError("Aktiviteten har ändrats av en annan användare.", {
          cause: result.error,
          currentVersion: currentVersionFromError(result.error)
        });
      }

      return resultOrThrow(result, "Kunde inte slutföra aktiviteten");
    }
  };
}
