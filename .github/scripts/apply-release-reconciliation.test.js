"use strict"

const assert = require("node:assert/strict")
const { test } = require("node:test")

const {
  applyAction,
  resolveDefaultBranch,
  resolveLatestArgs,
  selectActionableActions
} = require("./apply-release-reconciliation.js")

const TEST_ARTIFACT_DIR = "/artifacts"

function noopWriteFile() {}

test("selectActionableActions keeps only create and update actions", () => {
  const plan = {
    actions: [
      { action: "create", tag: "v1.0.0" },
      { action: "skip", tag: "v1.1.0" },
      { action: "update", tag: "v0.9.0" }
    ]
  }

  assert.deepEqual(
    selectActionableActions(plan).map(action => action.tag),
    ["v1.0.0", "v0.9.0"]
  )
})

test("resolveLatestArgs marks the release-sha target as latest", () => {
  const context = { releaseSha: "sha-a" }

  assert.deepEqual(resolveLatestArgs({ target_sha: "sha-a" }, context), ["--latest"])
  assert.deepEqual(resolveLatestArgs({ target_sha: "sha-b" }, context), ["--latest=false"])
})

test("resolveDefaultBranch prefers the input over the event default branch", () => {
  assert.equal(resolveDefaultBranch({ DEFAULT_BRANCH_INPUT: "release", EVENT_DEFAULT_BRANCH: "main" }), "release")
  assert.equal(resolveDefaultBranch({ EVENT_DEFAULT_BRANCH: "main" }), "main")
  assert.equal(resolveDefaultBranch({}), "")
})

test("applyAction creates a release when the tag does not already exist", () => {
  const calls = []
  const run = (command, args) => {
    calls.push([command, args])

    if (command === "git" && args[0] === "rev-list") {
      throw new Error("tag not found")
    }

    return ""
  }

  applyAction({
    action: { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes" },
    index: 0,
    context: { releaseSha: "sha-a" },
    run,
    env: { RELEASE_ARTIFACT_DIR: TEST_ARTIFACT_DIR },
    writeFile: noopWriteFile
  })

  const createCall = calls.find(([command, args]) => command === "gh" && args[1] === "create")

  assert.ok(createCall, "expected a gh release create call")
  assert.deepEqual(createCall[1], [
    "release",
    "create",
    "v1.0.0",
    "--target",
    "sha-a",
    "--title",
    "Title",
    "--notes-file",
    `${TEST_ARTIFACT_DIR}/release-notes-0.md`,
    "--latest"
  ])
})

test("applyAction edits an existing release for update actions", () => {
  const calls = []
  const run = (command, args) => {
    calls.push([command, args])

    return ""
  }

  applyAction({
    action: { action: "update", tag: "v1.0.0", target_sha: "sha-a", title: "New Title", notes: "New notes" },
    index: 2,
    context: { releaseSha: "sha-b" },
    run,
    env: { RELEASE_ARTIFACT_DIR: TEST_ARTIFACT_DIR },
    writeFile: noopWriteFile
  })

  const editCall = calls.find(([command, args]) => command === "gh" && args[1] === "edit")

  assert.deepEqual(editCall[1], [
    "release",
    "edit",
    "v1.0.0",
    "--title",
    "New Title",
    "--notes-file",
    `${TEST_ARTIFACT_DIR}/release-notes-2.md`
  ])
})

test("applyAction runs the ancestry check when a default branch is resolved from env", () => {
  const calls = []
  const run = (command, args) => {
    calls.push([command, args])

    if (command === "git" && args[0] === "rev-list") {
      throw new Error("tag not found")
    }

    return ""
  }

  applyAction({
    action: { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes" },
    index: 0,
    context: { releaseSha: "sha-a" },
    run,
    env: { DEFAULT_BRANCH_INPUT: "main", RELEASE_ARTIFACT_DIR: TEST_ARTIFACT_DIR },
    writeFile: noopWriteFile
  })

  const ancestryCall = calls.find(([command, args]) => command === "git" && args[0] === "merge-base")

  assert.deepEqual(ancestryCall[1], ["merge-base", "--is-ancestor", "sha-a", "origin/main"])
})

test("applyAction skips the ancestry check when env resolves no default branch", () => {
  const calls = []
  const run = (command, args) => {
    calls.push([command, args])

    if (command === "git" && args[0] === "rev-list") {
      throw new Error("tag not found")
    }

    return ""
  }

  applyAction({
    action: { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes" },
    index: 0,
    context: { releaseSha: "sha-a" },
    run,
    env: { RELEASE_ARTIFACT_DIR: TEST_ARTIFACT_DIR },
    writeFile: noopWriteFile
  })

  assert.equal(
    calls.some(([command, args]) => command === "git" && args[0] === "merge-base"),
    false
  )
})

test("applyAction rejects a create action whose tag already points elsewhere", () => {
  const run = (command, args) => {
    if (command === "git" && args[0] === "rev-list") {
      return "sha-existing"
    }

    return ""
  }

  assert.throws(
    () =>
      applyAction({
        action: { action: "create", tag: "v1.0.0", target_sha: "sha-a", title: "Title", notes: "Notes" },
        index: 0,
        context: { releaseSha: "sha-a" },
        run,
        env: { RELEASE_ARTIFACT_DIR: TEST_ARTIFACT_DIR },
        writeFile: noopWriteFile
      }),
    /Release tag v1\.0\.0 points to sha-existing, not sha-a/
  )
})
