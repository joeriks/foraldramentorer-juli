import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseRepository, VersionConflictError } from "../supabase-repository.js";

test("repository reads caller context and case data through the Supabase client", async () => {
  const calls = [];
  const results = {
    cases: [{ id: "case-1", number: "D-1", title: "Demoärende" }],
    case_assignments: [{ id: "assignment-1", user_id: "user-1" }],
    case_activities: [{
      id: "activity-1",
      title: "Första kontakt",
      activity_definition_id: "definition-1",
      activity_definition_version: 1
    }],
    activity_result_definitions: [{
      activity_definition_id: "definition-1",
      activity_definition_version: 1,
      code: "completed-as-planned",
      label: "Genomförd enligt plan",
      classification: "accepted"
    }],
    case_events: [{ id: "event-1", type: "case.created" }],
    case_description_versions: [{ id: "description-1", version: 1, text: "Demo" }],
    case_notes: [{ id: "note-version-1", note_id: "note-1", text: "Anteckning" }],
    activity_deviations: [{ id: "deviation-1", activity_id: "activity-1", status: "open" }],
    deviation_decisions: [{ id: "decision-1", deviation_id: "deviation-1", outcome: "continue" }],
    documents: [{ id: "document-1", title: "Bilaga", current_version: 1 }],
    document_versions: [{ id: "document-version-1", document_id: "document-1", version: 1 }]
  };
  const client = {
    async rpc(name) {
      calls.push({ type: "rpc", name });
      return { data: { organization: { slug: "demo" } }, error: null };
    },
    from(table) {
      calls.push({ type: "from", table });
      return queryBuilder(results[table] || [], calls, table);
    }
  };
  const repository = createSupabaseRepository(client);

  assert.equal((await repository.getSessionContext()).organization.slug, "demo");
  assert.equal((await repository.listCases({ limit: 500 })).length, 1);
  const workspace = await repository.getCaseWorkspace("case-1");
  assert.equal(workspace.case.id, "case-1");
  assert.equal(workspace.assignments.length, 1);
  assert.equal(workspace.activities.length, 1);
  assert.equal(workspace.activityResults.length, 1);
  assert.equal(workspace.events.length, 1);
  assert.equal(workspace.descriptionVersions.length, 1);
  assert.equal(workspace.notes.length, 1);
  assert.equal(workspace.deviations.length, 1);
  assert.equal(workspace.deviationDecisions.length, 1);
  assert.equal(workspace.documents.length, 1);
  assert.equal(workspace.documentVersions.length, 1);
  assert.ok(calls.some((call) => call.type === "from" && call.table === "activity_result_definitions"));
  assert.ok(calls.some((call) => call.method === "limit" && call.value === 100));
  assert.ok(calls.filter((call) => call.method === "eq" && call.value === "case-1").length >= 8);
  assert.ok(calls.some((call) => call.table === "deviation_decisions" && call.method === "in"));
  assert.ok(calls.some((call) => call.table === "document_versions" && call.method === "in"));
});

test("repository surfaces Supabase errors instead of returning partial data", async () => {
  const repository = createSupabaseRepository({
    async rpc() { return { data: null, error: { message: "RLS denied" } }; },
    from() { throw new Error("not used"); }
  });
  await assert.rejects(repository.getSessionContext(), /RLS denied/);
});

test("repository reads the complete activity definition administration catalog", async () => {
  const calls = [];
  const results = {
    activity_definitions: [{ id: "definition-1", stable_key: "home-visit", current_version: 2 }],
    activity_definition_versions: [{ activity_definition_id: "definition-1", version: 2, title: "Hembesök" }],
    activity_result_definitions: [{ activity_definition_id: "definition-1", activity_definition_version: 2, code: "done" }],
    activity_definition_events: [{ activity_definition_id: "definition-1", activity_definition_version: 2, reason: "Reviderad" }]
  };
  const repository = createSupabaseRepository({
    from(table) { return queryBuilder(results[table] || [], calls, table); }
  });

  const catalog = await repository.listActivityDefinitions();
  assert.equal(catalog.definitions.length, 1);
  assert.equal(catalog.versions[0].title, "Hembesök");
  assert.equal(catalog.results[0].code, "done");
  assert.equal(catalog.events[0].reason, "Reviderad");
  assert.ok(calls.some((call) => call.table === "activity_definition_events" && call.method === "limit" && call.value === 100));
});

test("repository publishes a normalized reviewed activity definition", async () => {
  let rpcCall;
  const repository = createSupabaseRepository({
    async rpc(name, parameters) {
      rpcCall = { name, parameters };
      return { data: { id: "definition-1", current_version: 2 }, error: null };
    }
  });

  const definition = await repository.publishActivityDefinition({
    activityDefinitionId: "definition-1",
    expectedCurrentVersion: 1,
    stableKey: "home-visit",
    title: " Hembesök ",
    description: "Reviderad katalog",
    results: [
      { code: "done", label: "Genomförd", classification: "ACCEPTED" },
      { code: "cancelled", label: "Inställd", classification: "deviation" }
    ],
    reason: " Granskad av verksamhetsansvarig ",
    idempotencyKey: "definition-publish-2"
  });

  assert.equal(definition.current_version, 2);
  assert.deepEqual(rpcCall, {
    name: "publish_activity_definition",
    parameters: {
      p_activity_definition_id: "definition-1",
      p_expected_current_version: 1,
      p_stable_key: "home-visit",
      p_title: "Hembesök",
      p_description: "Reviderad katalog",
      p_results: [
        { code: "done", label: "Genomförd", classification: "accepted", sort_order: 10 },
        { code: "cancelled", label: "Inställd", classification: "deviation", sort_order: 20 }
      ],
      p_reason: "Granskad av verksamhetsansvarig",
      p_idempotency_key: "definition-publish-2"
    }
  });
});

test("repository maps definition SQLSTATE 40001 to the shared version conflict", async () => {
  const repository = createSupabaseRepository({
    async rpc() {
      return { data: null, error: { code: "40001", message: "activity definition version conflict: expected 1, current 2" } };
    }
  });

  await assert.rejects(repository.publishActivityDefinition({
    activityDefinitionId: "definition-1",
    expectedCurrentVersion: 1,
    stableKey: "home-visit",
    title: "Hembesök",
    results: [{ code: "done", label: "Genomförd", classification: "accepted" }],
    reason: "Stale editor",
    idempotencyKey: "definition-stale"
  }), (error) => {
    assert.ok(error instanceof VersionConflictError);
    assert.equal(error.currentVersion, 2);
    return true;
  });
});

test("repository rejects duplicate definition results before the RPC", async () => {
  let called = false;
  const repository = createSupabaseRepository({ async rpc() { called = true; } });
  await assert.rejects(repository.publishActivityDefinition({
    stableKey: "home-visit",
    title: "Hembesök",
    results: [
      { code: "done", label: "Genomförd", classification: "accepted" },
      { code: "done", label: "Genomförd igen", classification: "deviation" }
    ],
    reason: "Duplicate test",
    idempotencyKey: "definition-duplicate"
  }), /Resultatkoder måste vara unika/);
  assert.equal(called, false);
});

test("repository creates an activity with an explicit frozen definition version", async () => {
  let rpcCall;
  const repository = createSupabaseRepository({
    async rpc(name, parameters) {
      rpcCall = { name, parameters };
      return {
        data: {
          id: "activity-1",
          activity_definition_id: "definition-1",
          activity_definition_version: 3,
          version: 1
        },
        error: null
      };
    }
  });

  const activity = await repository.createCaseActivity({
    caseId: "case-1",
    activityDefinitionId: "definition-1",
    expectedActivityDefinitionVersion: 3,
    title: "  Uppföljande samtal  ",
    dueDate: "2026-09-10",
    idempotencyKey: "  activity-create-1  "
  });

  assert.equal(activity.activity_definition_version, 3);
  assert.deepEqual(rpcCall, {
    name: "create_case_activity",
    parameters: {
      p_case_id: "case-1",
      p_activity_definition_id: "definition-1",
      p_expected_activity_definition_version: 3,
      p_title: "Uppföljande samtal",
      p_due_date: "2026-09-10",
      p_idempotency_key: "activity-create-1"
    }
  });
});

test("repository maps a stale selected definition to VersionConflictError", async () => {
  const databaseError = {
    code: "40001",
    message: "activity definition version conflict: expected 2, current 3"
  };
  const repository = createSupabaseRepository({
    async rpc() { return { data: null, error: databaseError }; }
  });

  await assert.rejects(repository.createCaseActivity({
    caseId: "case-1",
    activityDefinitionId: "definition-1",
    expectedActivityDefinitionVersion: 2,
    title: "Stale",
    idempotencyKey: "activity-create-stale"
  }), (error) => {
    assert.ok(error instanceof VersionConflictError);
    assert.equal(error.currentVersion, 3);
    assert.equal(error.cause, databaseError);
    return true;
  });
});

test("repository transitions an activity into a normalized waiting state", async () => {
  let rpcCall;
  const repository = createSupabaseRepository({
    async rpc(name, parameters) {
      rpcCall = { name, parameters };
      return { data: { id: "activity-1", status: "waiting", version: 4 }, error: null };
    }
  });

  const activity = await repository.transitionCaseActivityWorkState({
    activityId: "activity-1",
    expectedVersion: 3,
    targetStatus: " WAITING ",
    waitingForParty: " MENTOR ",
    dueDate: "2026-09-14",
    reason: "  Inväntar komplettering  ",
    idempotencyKey: " work-state-1 "
  });

  assert.equal(activity.version, 4);
  assert.deepEqual(rpcCall, {
    name: "transition_case_activity_work_state",
    parameters: {
      p_activity_id: "activity-1",
      p_expected_version: 3,
      p_target_status: "waiting",
      p_waiting_for_party: "mentor",
      p_due_date: "2026-09-14",
      p_reason: "Inväntar komplettering",
      p_idempotency_key: "work-state-1"
    }
  });
});

test("repository validates waiting details and maps work-state conflicts", async () => {
  let called = false;
  const invalidRepository = createSupabaseRepository({ async rpc() { called = true; } });
  await assert.rejects(invalidRepository.transitionCaseActivityWorkState({
    activityId: "activity-1",
    expectedVersion: 1,
    targetStatus: "waiting",
    reason: "Inväntar",
    idempotencyKey: "invalid-wait"
  }), /Ange vem eller vad/);
  assert.equal(called, false);

  const databaseError = { code: "40001", message: "activity version conflict: expected 1, current 2" };
  const staleRepository = createSupabaseRepository({
    async rpc() { return { data: null, error: databaseError }; }
  });
  await assert.rejects(staleRepository.transitionCaseActivityWorkState({
    activityId: "activity-1",
    expectedVersion: 1,
    targetStatus: "active",
    idempotencyKey: "stale-work-state"
  }), (error) => error instanceof VersionConflictError && error.currentVersion === 2);
});

test("repository reopens an activity with a mandatory normalized reason", async () => {
  let rpcCall;
  const repository = createSupabaseRepository({
    async rpc(name, parameters) {
      rpcCall = { name, parameters };
      return { data: { id: "activity-1", status: "active", version: 3 }, error: null };
    }
  });

  const activity = await repository.reopenCaseActivity({
    activityId: "activity-1",
    expectedVersion: 2,
    reason: "  Nytt underlag har kommit in  ",
    idempotencyKey: " reopen-activity-1 "
  });

  assert.equal(activity.status, "active");
  assert.deepEqual(rpcCall, {
    name: "reopen_case_activity",
    parameters: {
      p_activity_id: "activity-1",
      p_expected_version: 2,
      p_reason: "Nytt underlag har kommit in",
      p_idempotency_key: "reopen-activity-1"
    }
  });
});

test("repository rejects an unmotivated reopen and maps reopen conflicts", async () => {
  let called = false;
  const invalidRepository = createSupabaseRepository({ async rpc() { called = true; } });
  await assert.rejects(invalidRepository.reopenCaseActivity({
    activityId: "activity-1",
    expectedVersion: 2,
    reason: " ",
    idempotencyKey: "invalid-reopen"
  }), /Motivering/);
  assert.equal(called, false);

  const staleRepository = createSupabaseRepository({
    async rpc() {
      return { data: null, error: { code: "40001", message: "activity version conflict: expected 2, current 3" } };
    }
  });
  await assert.rejects(staleRepository.reopenCaseActivity({
    activityId: "activity-1",
    expectedVersion: 2,
    reason: "Stale",
    idempotencyKey: "stale-reopen"
  }), (error) => error instanceof VersionConflictError && error.currentVersion === 3);
});

test("repository sends a normalized versioned case lifecycle command", async () => {
  let rpcCall;
  const repository = createSupabaseRepository({
    async rpc(name, parameters) {
      rpcCall = { name, parameters };
      return { data: { id: "case-1", status: "closed", version: 5 }, error: null };
    }
  });

  const caseRecord = await repository.transitionCaseLifecycle({
    caseId: "case-1",
    expectedVersion: 4,
    action: " CLOSE ",
    reasonCode: " NO_FURTHER_ACTION ",
    note: "  Fortsatt arbete behövs inte  ",
    idempotencyKey: " lifecycle-close-1 "
  });

  assert.equal(caseRecord.status, "closed");
  assert.deepEqual(rpcCall, {
    name: "transition_case_lifecycle",
    parameters: {
      p_case_id: "case-1",
      p_expected_version: 4,
      p_action: "close",
      p_reason_code: "no_further_action",
      p_note: "Fortsatt arbete behövs inte",
      p_resume_at: null,
      p_idempotency_key: "lifecycle-close-1"
    }
  });
});

test("repository validates case lifecycle input and maps concurrency conflicts", async () => {
  let called = false;
  const invalidRepository = createSupabaseRepository({ async rpc() { called = true; } });
  await assert.rejects(invalidRepository.transitionCaseLifecycle({
    caseId: "case-1",
    expectedVersion: 1,
    action: "resume",
    reasonCode: "work_resumed",
    note: "Fortsätt",
    resumeAt: "2026-09-20",
    idempotencyKey: "invalid-resume-date"
  }), /Bevakningsdatum/);
  assert.equal(called, false);

  const staleRepository = createSupabaseRepository({
    async rpc() {
      return { data: null, error: { code: "40001", message: "case version conflict: expected 2, current 3" } };
    }
  });
  await assert.rejects(staleRepository.transitionCaseLifecycle({
    caseId: "case-1",
    expectedVersion: 2,
    action: "pause",
    reasonCode: "awaiting_information",
    note: "Inväntar svar",
    idempotencyKey: "stale-lifecycle"
  }), (error) => error instanceof VersionConflictError && error.currentVersion === 3);
});

test("repository completes an activity through the idempotent versioned RPC", async () => {
  let rpcCall;
  const repository = createSupabaseRepository({
    async rpc(name, parameters) {
      rpcCall = { name, parameters };
      return { data: { id: "activity-1", status: "completed", version: 8 }, error: null };
    }
  });
  const activity = await repository.completeCaseActivity({
    activityId: "activity-1",
    expectedVersion: 7,
    resultCode: "completed-as-planned",
    classification: "accepted",
    idempotencyKey: "activity-complete-1"
  });
  assert.equal(activity.version, 8);
  assert.deepEqual(rpcCall, {
    name: "complete_case_activity",
    parameters: {
      p_activity_id: "activity-1",
      p_expected_version: 7,
      p_result_code: "completed-as-planned",
      p_classification: "accepted",
      p_idempotency_key: "activity-complete-1"
    }
  });
});

test("repository maps SQLSTATE 40001 to a stable version conflict", async () => {
  const databaseError = {
    code: "40001",
    message: "activity version conflict: expected 3, current 4",
    details: null,
    hint: null
  };
  const repository = createSupabaseRepository({
    async rpc() { return { data: null, error: databaseError }; }
  });
  await assert.rejects(
    repository.completeCaseActivity({
      activityId: "activity-1",
      expectedVersion: 3,
      resultCode: "not-completed",
      classification: "deviation",
      idempotencyKey: "activity-conflict-1"
    }),
    (error) => {
      assert.ok(error instanceof VersionConflictError);
      assert.equal(error.code, "VERSION_CONFLICT");
      assert.equal(error.currentVersion, 4);
      assert.equal(error.cause, databaseError);
      return true;
    }
  );
});

test("repository rejects incomplete activity commands before an RPC call", async () => {
  let called = false;
  const repository = createSupabaseRepository({ async rpc() { called = true; } });
  await assert.rejects(repository.completeCaseActivity({
    activityId: "activity-1",
    expectedVersion: 0,
    resultCode: "completed-as-planned",
    idempotencyKey: "key-1"
  }), /Giltig aktivitetsversion/);
  assert.equal(called, false);
});

test("repository writes versioned descriptions and append-only notes through RPCs", async () => {
  const calls = [];
  const repository = createSupabaseRepository({
    async rpc(name, parameters) {
      calls.push({ name, parameters });
      return { data: name === "save_case_note" ? { id: "note-version-1", version: 1 } : { id: "case-1", version: 4 }, error: null };
    }
  });

  assert.equal((await repository.updateCaseDescription({
    caseId: "case-1",
    expectedCaseVersion: 2,
    text: "Ny beskrivning",
    idempotencyKey: "description-1"
  })).version, 4);
  assert.equal((await repository.saveCaseNote({
    caseId: "case-1",
    expectedCaseVersion: 3,
    targetType: "activity",
    targetId: "activity-1",
    text: " Saklig anteckning ",
    idempotencyKey: "note-1"
  })).version, 1);

  assert.deepEqual(calls[0], {
    name: "update_case_description",
    parameters: {
      p_case_id: "case-1",
      p_expected_case_version: 2,
      p_text: "Ny beskrivning",
      p_idempotency_key: "description-1"
    }
  });
  assert.equal(calls[1].name, "save_case_note");
  assert.equal(calls[1].parameters.p_target_type, "activity");
  assert.equal(calls[1].parameters.p_text, "Saklig anteckning");
});

test("repository records a validated deviation decision", async () => {
  let rpcCall;
  const repository = createSupabaseRepository({
    async rpc(name, parameters) {
      rpcCall = { name, parameters };
      return { data: { id: "decision-1", outcome: "request_supplement" }, error: null };
    }
  });
  const decision = await repository.decideActivityDeviation({
    deviationId: "deviation-1",
    expectedDeviationVersion: 1,
    expectedCaseVersion: 4,
    outcome: "request_supplement",
    reasonCode: "missing-information",
    note: "Begär komplett underlag",
    resumeAt: "2026-09-01",
    followUpTitle: "Begär komplettering",
    idempotencyKey: "decision-1"
  });
  assert.equal(decision.outcome, "request_supplement");
  assert.equal(rpcCall.name, "decide_activity_deviation");
  assert.equal(rpcCall.parameters.p_expected_case_version, 4);
  assert.equal(rpcCall.parameters.p_follow_up_title, "Begär komplettering");
});

test("repository maps workspace command concurrency failures to VersionConflictError", async () => {
  const repository = createSupabaseRepository({
    async rpc() { return { data: null, error: { code: "40001", message: "case version conflict: expected 2, current 3" } }; }
  });
  await assert.rejects(repository.updateCaseDescription({
    caseId: "case-1",
    expectedCaseVersion: 2,
    text: "Stale",
    idempotencyKey: "stale-description"
  }), (error) => error instanceof VersionConflictError && error.currentVersion === 3);
});

test("repository uploads a case document through reservation, private Storage and completion", async () => {
  const calls = [];
  const client = {
    async rpc(name, parameters) {
      calls.push({ type: "rpc", name, parameters });
      if (name === "create_document_upload") {
        return { data: {
          id: "document-version-1",
          storage_bucket: "organization-documents",
          storage_object_path: "org/document/version",
          mime_type: "application/pdf"
        }, error: null };
      }
      return { data: { id: "document-version-1", status: "available" }, error: null };
    },
    storage: {
      from(bucket) {
        calls.push({ type: "storage", method: "from", bucket });
        return {
          async upload(path, file, options) {
            calls.push({ type: "storage", method: "upload", path, file, options });
            return { data: { path }, error: null };
          }
        };
      }
    }
  };
  const repository = createSupabaseRepository(client);
  const file = { name: "underlag.pdf", type: "application/pdf", size: 42 };
  const completed = await repository.uploadCaseDocument({
    caseId: "case-1",
    title: "Underlag",
    file,
    idempotencyKey: "document-upload-1"
  });
  assert.equal(completed.status, "available");
  assert.equal(calls[0].name, "create_document_upload");
  assert.equal(calls[1].bucket, "organization-documents");
  assert.equal(calls[2].path, "org/document/version");
  assert.equal(calls[3].name, "complete_document_upload");
  assert.equal(calls[3].parameters.p_idempotency_key, "document-upload-1:complete");
});

function queryBuilder(rows, calls, table) {
  let single = false;
  const builder = {
    select(value) { calls.push({ table, method: "select", value }); return builder; },
    order(value, options) { calls.push({ table, method: "order", value, options }); return builder; },
    limit(value) { calls.push({ table, method: "limit", value }); return builder; },
    eq(column, value) { calls.push({ table, method: "eq", column, value }); return builder; },
    in(column, value) { calls.push({ table, method: "in", column, value }); return builder; },
    single() { single = true; calls.push({ table, method: "single" }); return builder; },
    then(resolve, reject) {
      const data = single ? rows[0] : rows;
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    }
  };
  return builder;
}
