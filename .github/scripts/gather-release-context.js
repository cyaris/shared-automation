"use strict"

const cp = require("child_process")
const fs = require("fs")
const path = require("path")

const MAX_COMMITS = 1000
const MAX_FILES = 1000

function readFileMaybe(filePath, max) {
  try {
    const text = fs.readFileSync(filePath, "utf8")

    return typeof max === "number" ? text.slice(0, max) : text
  } catch {
    return ""
  }
}

function parseCommits(commitsText) {
  return commitsText
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      const [sha, shortSha, date, ...subjectParts] = line.split("\t")

      return { index: index + 1, sha, shortSha, date, subject: subjectParts.join("\t") }
    })
}

function resolveReleaseTargetSha(release, git) {
  try {
    return git(["rev-list", "-n", "1", `refs/tags/${release.tag_name}^{}`])
  } catch {
    try {
      return git(["rev-parse", `${release.target_commitish}^{commit}`])
    } catch {
      return ""
    }
  }
}

function buildExistingReleases(releasePages, commitIndexBySha, git) {
  const rawReleases = releasePages.flat()

  return rawReleases
    .map(release => ({
      tag: release.tag_name || "",
      title: release.name || "",
      notes: release.body || "",
      publishedAt: release.published_at || "",
      prerelease: Boolean(release.prerelease),
      draft: Boolean(release.draft),
      targetCommitish: release.target_commitish || "",
      targetSha: resolveReleaseTargetSha(release, git),
      url: release.html_url || ""
    }))
    .sort((a, b) => {
      const aIndex = commitIndexBySha.has(a.targetSha) ? commitIndexBySha.get(a.targetSha) : -1
      const bIndex = commitIndexBySha.has(b.targetSha) ? commitIndexBySha.get(b.targetSha) : -1

      return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
    })
}

function selectCommitWindow(allCommits, existingReleases, commitIndexBySha, maxCommits) {
  const releaseIndexes = existingReleases
    .map(release => commitIndexBySha.get(release.targetSha))
    .filter(index => Number.isInteger(index))
  const oldestReleaseIndex = releaseIndexes.length
    ? Math.min(...releaseIndexes)
    : Math.max(0, allCommits.length - maxCommits)
  const commitsSinceOldestRelease = allCommits.slice(oldestReleaseIndex)
  const commits = commitsSinceOldestRelease.slice(-maxCommits)

  return { commits, releaseIndexes, commitsSinceOldestRelease }
}

function buildContext({
  allCommits,
  existingReleases,
  releaseIndexes,
  commitsSinceOldestRelease,
  commits,
  allFiles,
  repository,
  defaultBranch,
  releaseSha,
  policyPath,
  updateExisting,
  basePolicy,
  localPolicy,
  agentsGuidance,
  maxCommits,
  maxFiles
}) {
  return {
    repository,
    defaultBranch: defaultBranch || "",
    releaseSha: releaseSha || "",
    policyPath,
    updateExisting: updateExisting === "true",
    commitCount: allCommits.length,
    omittedCommitCount: allCommits.length - commits.length,
    commitWindow: {
      maxCommits,
      startIndex: commits.length ? commits[0].index : 0,
      endIndex: commits.length ? commits[commits.length - 1].index : 0,
      includesCommitsSinceOldestExistingReleaseTarget:
        releaseIndexes.length > 0 && commitsSinceOldestRelease.length <= maxCommits
    },
    basePolicy,
    localPolicy,
    agentsGuidance,
    existingReleases,
    commits,
    changedFilesAtReleaseSha: allFiles.slice(0, maxFiles),
    omittedFileCount: Math.max(0, allFiles.length - maxFiles)
  }
}

function main() {
  const artifactDir = process.env.RELEASE_ARTIFACT_DIR
  const git = args => cp.execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()

  const allCommits = parseCommits(fs.readFileSync(path.join(artifactDir, "commits.tsv"), "utf8"))
  const commitIndexBySha = new Map(allCommits.map((commit, index) => [commit.sha, index]))

  const releasePages = JSON.parse(fs.readFileSync(path.join(artifactDir, "existing-releases.raw.json"), "utf8"))
  const existingReleases = buildExistingReleases(releasePages, commitIndexBySha, git)

  const { commits, releaseIndexes, commitsSinceOldestRelease } = selectCommitWindow(
    allCommits,
    existingReleases,
    commitIndexBySha,
    MAX_COMMITS
  )
  const allFiles = fs.readFileSync(path.join(artifactDir, "files.txt"), "utf8").split("\n").filter(Boolean)

  const context = buildContext({
    allCommits,
    existingReleases,
    releaseIndexes,
    commitsSinceOldestRelease,
    commits,
    allFiles,
    repository: process.env.GITHUB_REPOSITORY,
    defaultBranch: process.env.DEFAULT_BRANCH,
    releaseSha: process.env.RELEASE_SHA,
    policyPath: process.env.POLICY_PATH,
    updateExisting: process.env.UPDATE_EXISTING,
    basePolicy: readFileMaybe("../shared-automation/.github/release-policy.yml"),
    localPolicy: readFileMaybe(process.env.POLICY_PATH),
    agentsGuidance: readFileMaybe("AGENTS.md", 24000),
    maxCommits: MAX_COMMITS,
    maxFiles: MAX_FILES
  })

  fs.writeFileSync(path.join(artifactDir, "release-context.json"), JSON.stringify(context, null, 2))
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `commit_count=${allCommits.length}\n`)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_count=${existingReleases.length}\n`)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_sha=${context.releaseSha}\n`)
}

module.exports = {
  MAX_COMMITS,
  MAX_FILES,
  buildContext,
  buildExistingReleases,
  parseCommits,
  resolveReleaseTargetSha,
  selectCommitWindow
}

if (require.main === module) {
  main()
}
