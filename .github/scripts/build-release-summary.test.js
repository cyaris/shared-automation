"use strict"

const assert = require("node:assert/strict")
const { test } = require("node:test")

const {
  buildActionRows,
  buildSummaryMarkdown,
  countActionsByType,
  escapeCell,
  shortSha
} = require("./build-release-summary.js")

test("escapeCell escapes pipes and collapses newlines for Markdown table cells", () => {
  assert.equal(escapeCell("a | b"), "a \\| b")
  assert.equal(escapeCell("line one\nline two"), "line one<br>line two")
  assert.equal(escapeCell("line one\r\nline two"), "line one<br>line two")
  assert.equal(escapeCell(undefined), "")
})

test("shortSha truncates to twelve characters", () => {
  assert.equal(shortSha("0123456789abcdef"), "0123456789ab")
  assert.equal(shortSha(undefined), "")
})

test("countActionsByType tallies actions by their action field", () => {
  const actions = [{ action: "create" }, { action: "create" }, { action: "update" }, { action: "skip" }]

  assert.deepEqual(countActionsByType(actions), { create: 2, update: 1, skip: 1 })
})

test("buildActionRows renders a placeholder row when no actions are proposed", () => {
  assert.deepEqual(buildActionRows([]), ["| skip |  |  | No actions proposed | No release actions were proposed |"])
})

test("buildActionRows renders one row per action", () => {
  const actions = [
    { action: "create", tag: "v1.0.0", target_sha: "0123456789abcdef", title: "Title", reason: "Reason" }
  ]

  assert.deepEqual(buildActionRows(actions), ["| create | v1.0.0 | `0123456789ab` | Title | Reason |"])
})

test("buildSummaryMarkdown assembles the review Markdown from context and plan", () => {
  const context = {
    repository: "cyaris/example",
    releaseSha: "sha-a",
    defaultBranch: "main",
    existingReleases: [{ tag: "v0.9.0" }],
    commits: [{ sha: "a" }, { sha: "b" }],
    commitCount: 2,
    omittedCommitCount: 0,
    changedFilesAtReleaseSha: ["a.txt"],
    omittedFileCount: 0,
    updateExisting: true
  }
  const plan = { summary: "Plan summary", actions: [{ action: "create", tag: "v1.0.0", target_sha: "sha-a" }] }

  const markdown = buildSummaryMarkdown({ context, plan, summaryOverride: "" })

  assert.match(markdown, /# Release Reconciliation Review: cyaris\/example/)
  assert.match(markdown, /- Target commit: `sha-a`/)
  assert.match(markdown, /- Create: 1/)
  assert.match(markdown, /Plan summary/)
  assert.match(markdown, /\| create \| v1\.0\.0 \| `sha-a` \|/)
})

test("buildSummaryMarkdown prefers summaryOverride over the plan's own summary", () => {
  const context = {
    repository: "cyaris/example",
    existingReleases: [],
    commits: [],
    commitCount: 0,
    omittedCommitCount: 0,
    changedFilesAtReleaseSha: [],
    omittedFileCount: 0
  }
  const plan = { summary: "Plan summary", actions: [] }

  const markdown = buildSummaryMarkdown({ context, plan, summaryOverride: "Override summary" })

  assert.match(markdown, /Override summary/)
  assert.doesNotMatch(markdown, /Plan summary/)
})
