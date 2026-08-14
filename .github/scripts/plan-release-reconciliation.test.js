"use strict"

const assert = require("node:assert/strict")
const { test } = require("node:test")

const {
  TAG_PATTERN,
  buildRequestBody,
  buildSummaryDelimiter,
  extractOutputText,
  normalizeActions,
  validateActions
} = require("./plan-release-reconciliation.js")

function baseContext(overrides = {}) {
  return { updateExisting: true, commits: [{ sha: "sha-a" }, { sha: "sha-b" }], existingReleases: [], ...overrides }
}

test("TAG_PATTERN accepts stable version tags and rejects malformed ones", () => {
  assert.equal(TAG_PATTERN.test("v1"), true)
  assert.equal(TAG_PATTERN.test("v1.2.3"), true)
  assert.equal(TAG_PATTERN.test("v1.2.3-beta1"), true)
  assert.equal(TAG_PATTERN.test("1.2.3"), false)
  assert.equal(TAG_PATTERN.test("v1.2 .3"), false)
  assert.equal(TAG_PATTERN.test("v1/2"), false)
})

test("normalizeActions trims and collapses whitespace, defaulting missing fields", () => {
  const normalized = normalizeActions([
    {
      action: " create ",
      tag: " v1.0.0 ",
      target_sha: " sha-a ",
      title: "  My   Title ",
      notes: " notes ",
      reason: "  a   reason "
    }
  ])

  assert.deepEqual(normalized, [
    { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "My Title", notes: "notes", reason: "a reason" }
  ])
})

test("normalizeActions treats a non-array input as no actions", () => {
  assert.deepEqual(normalizeActions(undefined), [])
})

test("validateActions accepts a well-formed create action", () => {
  const actions = normalizeActions([
    { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" }
  ])

  const validated = validateActions(actions, baseContext())

  assert.equal(validated.length, 1)
  assert.deepEqual(validated[0], {
    action: "create",
    tag: "v1.0.0",
    target_sha: "sha-a",
    title: "Title",
    notes: "Notes",
    reason: "Reason"
  })
})

test("validateActions rejects an invalid tag format", () => {
  const actions = normalizeActions([
    { action: "create", tag: "1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" }
  ])

  assert.throws(() => validateActions(actions, baseContext()), /Invalid release tag/)
})

test("validateActions rejects a create action reusing an existing release tag", () => {
  const actions = normalizeActions([
    { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" }
  ])
  const context = baseContext({ existingReleases: [{ tag: "v1.0.0", targetSha: "sha-old" }] })

  assert.throws(() => validateActions(actions, context), /targets an existing release tag/)
})

test("validateActions rejects two create actions with the same tag", () => {
  const actions = normalizeActions([
    { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" },
    { action: "create", tag: "v1.0.0", target_sha: "sha-b", title: "Title 2", notes: "Notes 2", reason: "Reason 2" }
  ])

  assert.throws(() => validateActions(actions, baseContext()), /Duplicate create action for tag/)
})

test("validateActions rejects two create actions targeting the same commit", () => {
  const actions = normalizeActions([
    { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" },
    { action: "create", tag: "v2.0.0", target_sha: "sha-a", title: "Title 2", notes: "Notes 2", reason: "Reason 2" }
  ])

  assert.throws(
    () => validateActions(actions, baseContext()),
    /Multiple create actions target the same commit: v2\.0\.0 sha-a/
  )
})

test("validateActions accepts two create actions targeting distinct commits", () => {
  const actions = normalizeActions([
    { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" },
    { action: "create", tag: "v2.0.0", target_sha: "sha-b", title: "Title 2", notes: "Notes 2", reason: "Reason 2" }
  ])

  const validated = validateActions(actions, baseContext())

  assert.deepEqual(
    validated.map(action => action.tag),
    ["v1.0.0", "v2.0.0"]
  )
})

test("validateActions rejects a create action targeting a commit outside the reconciled history", () => {
  const actions = normalizeActions([
    { action: "create", tag: "v1.0.0", target_sha: "sha-outside", title: "Title", notes: "Notes", reason: "Reason" }
  ])

  assert.throws(() => validateActions(actions, baseContext()), /outside the reconciled history/)
})

test("validateActions rejects an update action that would move an existing tag's target", () => {
  const actions = normalizeActions([
    { action: "update", tag: "v1.0.0", target_sha: "sha-b", title: "Title", notes: "Notes", reason: "Reason" }
  ])
  const context = baseContext({ existingReleases: [{ tag: "v1.0.0", targetSha: "sha-a" }] })

  assert.throws(() => validateActions(actions, context), /cannot move v1\.0\.0 from sha-a to sha-b/)
})

test("validateActions accepts an update action for a legacy tag that predates the v prefix convention", () => {
  const actions = normalizeActions([
    { action: "update", tag: "0.0.1", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" }
  ])
  const context = baseContext({ existingReleases: [{ tag: "0.0.1", targetSha: "sha-a" }] })

  const validated = validateActions(actions, context)

  assert.equal(validated[0].action, "update")
  assert.equal(validated[0].tag, "0.0.1")
})

test("validateActions rejects an update action for a tag with no matching existing release", () => {
  const actions = normalizeActions([
    { action: "update", tag: "v9.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" }
  ])

  assert.throws(() => validateActions(actions, baseContext()), /targets a missing release tag/)
})

test("validateActions downgrades update actions to skip when updateExisting is disabled", () => {
  const actions = normalizeActions([
    { action: "update", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Existing reason" }
  ])
  const context = baseContext({ updateExisting: false, existingReleases: [{ tag: "v1.0.0", targetSha: "sha-a" }] })

  const validated = validateActions(actions, context)

  assert.equal(validated[0].action, "skip")
  assert.match(validated[0].reason, /Existing release updates are disabled/)
})

test("validateActions rejects an unsupported action name", () => {
  const actions = normalizeActions([
    { action: "delete", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes", reason: "Reason" }
  ])

  assert.throws(() => validateActions(actions, baseContext()), /Unsupported release action/)
})

test("buildRequestBody embeds the model and serialized context", () => {
  const context = baseContext()
  const body = buildRequestBody({ context, model: "gpt-5-mini" })

  assert.equal(body.model, "gpt-5-mini")
  assert.equal(body.input[1].content, JSON.stringify(context, null, 2))
  assert.equal(body.text.format.type, "json_schema")
})

test("extractOutputText reads output_text when present", () => {
  assert.equal(extractOutputText({ output_text: "{}" }), "{}")
})

test("extractOutputText falls back to the first output_text content item", () => {
  const data = {
    output: [{ content: [{ type: "reasoning" }] }, { content: [{ type: "output_text", text: '{"summary":"ok"}' }] }]
  }

  assert.equal(extractOutputText(data), '{"summary":"ok"}')
})

test("buildSummaryDelimiter never collides with text already present in the summary", () => {
  const delimiter = buildSummaryDelimiter("plain summary")

  assert.match(delimiter, /^SUMMARY_[0-9a-f]{24}$/)
})
