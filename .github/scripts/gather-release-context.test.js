"use strict"

const assert = require("node:assert/strict")
const { test } = require("node:test")
const path = require("path")

const {
  buildContext,
  buildExistingReleases,
  parseCommits,
  resolvePolicyPath,
  resolveReleaseTargetSha,
  selectCommitWindow
} = require("./gather-release-context.js")

test("parseCommits splits tab-separated commit lines into ordered entries", () => {
  const commitsText = "aaa\tabc\t2026-01-01\tFirst commit\nbbb\tbcd\t2026-01-02\tSecond: with a colon\n"

  assert.deepEqual(parseCommits(commitsText), [
    { index: 1, sha: "aaa", shortSha: "abc", date: "2026-01-01", subject: "First commit" },
    { index: 2, sha: "bbb", shortSha: "bcd", date: "2026-01-02", subject: "Second: with a colon" }
  ])
})

test("parseCommits ignores blank lines", () => {
  assert.deepEqual(parseCommits("\n\n"), [])
})

test("resolveReleaseTargetSha prefers the tag's commit over the target_commitish branch", () => {
  const git = args => {
    if (args[0] === "rev-list") {
      return "tag-sha"
    }

    throw new Error("unexpected git call")
  }

  assert.equal(resolveReleaseTargetSha({ tag_name: "v1.0.0" }, git), "tag-sha")
})

test("resolveReleaseTargetSha falls back to target_commitish when the tag is missing", () => {
  const git = args => {
    if (args[0] === "rev-list") {
      throw new Error("no such tag")
    }

    return "branch-sha"
  }

  assert.equal(resolveReleaseTargetSha({ tag_name: "v1.0.0", target_commitish: "main" }, git), "branch-sha")
})

test("resolveReleaseTargetSha returns an empty string when both lookups fail", () => {
  const git = () => {
    throw new Error("no such ref")
  }

  assert.equal(resolveReleaseTargetSha({ tag_name: "v1.0.0" }, git), "")
})

test("resolvePolicyPath accepts a path inside the repository root", () => {
  const repoRoot = "/repo"

  assert.equal(
    resolvePolicyPath(".github/release-policy.yml", repoRoot),
    path.join(repoRoot, ".github/release-policy.yml")
  )
})

test("resolvePolicyPath passes through a falsy policy path unchanged", () => {
  assert.equal(resolvePolicyPath("", "/repo"), "")
  assert.equal(resolvePolicyPath(undefined, "/repo"), undefined)
})

test("resolvePolicyPath rejects a relative traversal outside the repository root", () => {
  assert.throws(() => resolvePolicyPath("../outside.yml", "/repo"), /policy-path escapes the caller repository/)
  assert.throws(() => resolvePolicyPath("../../etc/passwd", "/repo"), /policy-path escapes the caller repository/)
})

test("resolvePolicyPath rejects an absolute path outside the repository root", () => {
  assert.throws(() => resolvePolicyPath("/etc/passwd", "/repo"), /policy-path escapes the caller repository/)
})

test("buildExistingReleases keeps drafts and sorts by commit history order", () => {
  const git = args => {
    const tag = args[3].replace("refs/tags/", "").replace("^{}", "")

    if (tag === "v2.0.0") {
      return "sha-2"
    }

    if (tag === "v1.0.0") {
      return "sha-1"
    }

    throw new Error(`unexpected tag ${tag}`)
  }
  const commitIndexBySha = new Map([
    ["sha-1", 0],
    ["sha-2", 1]
  ])
  const releasePages = [
    [
      { tag_name: "v2.0.0", draft: false },
      { tag_name: "v1.0.0", draft: false },
      { tag_name: "v3.0.0-draft", draft: true }
    ]
  ]

  const existingReleases = buildExistingReleases(releasePages, commitIndexBySha, git)

  assert.deepEqual(
    existingReleases.map(release => release.tag),
    ["v1.0.0", "v2.0.0", "v3.0.0-draft"]
  )
  assert.deepEqual(
    existingReleases.map(release => release.draft),
    [false, false, true]
  )
})

test("selectCommitWindow starts from the oldest existing release target", () => {
  const allCommits = [
    { index: 1, sha: "a" },
    { index: 2, sha: "b" },
    { index: 3, sha: "c" },
    { index: 4, sha: "d" }
  ]
  const commitIndexBySha = new Map(allCommits.map((commit, index) => [commit.sha, index]))
  const existingReleases = [{ targetSha: "b" }]

  const { commits, releaseIndexes } = selectCommitWindow(allCommits, existingReleases, commitIndexBySha, 1000)

  assert.deepEqual(releaseIndexes, [1])
  assert.deepEqual(
    commits.map(commit => commit.sha),
    ["b", "c", "d"]
  )
})

test("selectCommitWindow caps the window at maxCommits when there are no existing releases", () => {
  const allCommits = [
    { index: 1, sha: "a" },
    { index: 2, sha: "b" },
    { index: 3, sha: "c" }
  ]
  const commitIndexBySha = new Map(allCommits.map((commit, index) => [commit.sha, index]))

  const { commits } = selectCommitWindow(allCommits, [], commitIndexBySha, 2)

  assert.deepEqual(
    commits.map(commit => commit.sha),
    ["b", "c"]
  )
})

test("buildContext assembles the release-context.json shape", () => {
  const commits = [
    { index: 2, sha: "b" },
    { index: 3, sha: "c" }
  ]
  const context = buildContext({
    allCommits: [{ index: 1, sha: "a" }, ...commits],
    existingReleases: [{ tag: "v1.0.0", targetSha: "a" }],
    releaseIndexes: [0],
    commitsSinceOldestRelease: [{ index: 1, sha: "a" }, ...commits],
    commits,
    allFiles: ["a.txt", "b.txt"],
    repository: "cyaris/example",
    defaultBranch: "main",
    releaseSha: "c",
    policyPath: ".github/release-policy.yml",
    updateExisting: "true",
    basePolicy: "base",
    localPolicy: "local",
    agentsGuidance: "guidance",
    maxCommits: 1000,
    maxFiles: 1000
  })

  assert.equal(context.repository, "cyaris/example")
  assert.equal(context.updateExisting, true)
  assert.equal(context.commitCount, 3)
  assert.equal(context.omittedCommitCount, 1)
  assert.equal(context.commitWindow.startIndex, 2)
  assert.equal(context.commitWindow.endIndex, 3)
  assert.equal(context.commitWindow.includesCommitsSinceOldestExistingReleaseTarget, true)
  assert.deepEqual(context.changedFilesAtReleaseSha, ["a.txt", "b.txt"])
  assert.equal(context.omittedFileCount, 0)
})

test("buildContext defaults updateExisting to false for any non-'true' value", () => {
  const context = buildContext({
    allCommits: [],
    existingReleases: [],
    releaseIndexes: [],
    commitsSinceOldestRelease: [],
    commits: [],
    allFiles: [],
    repository: "cyaris/example",
    defaultBranch: "",
    releaseSha: "",
    policyPath: ".github/release-policy.yml",
    updateExisting: undefined,
    basePolicy: "",
    localPolicy: "",
    agentsGuidance: "",
    maxCommits: 1000,
    maxFiles: 1000
  })

  assert.equal(context.updateExisting, false)
})
