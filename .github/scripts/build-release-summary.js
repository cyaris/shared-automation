"use strict"

const fs = require("fs")
const path = require("path")

function escapeCell(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>")
}

function shortSha(value) {
  return String(value || "").slice(0, 12)
}

function countActionsByType(actions) {
  return actions.reduce((counts, action) => {
    counts[action.action] = (counts[action.action] || 0) + 1

    return counts
  }, {})
}

function buildActionRows(actions) {
  if (!actions.length) {
    return ["| skip |  |  | No actions proposed | No release actions were proposed |"]
  }

  return actions.map(
    action =>
      `| ${escapeCell(action.action)} | ${escapeCell(action.tag)} | \`${shortSha(action.target_sha)}\` | ${escapeCell(action.title)} | ${escapeCell(action.reason)} |`
  )
}

function buildSummaryMarkdown({ context, plan, summaryOverride }) {
  const counts = countActionsByType(plan.actions)

  const lines = [
    `# Release Reconciliation Review: ${context.repository}`,
    "",
    `- Target commit: \`${context.releaseSha}\``,
    `- Default branch: \`${context.defaultBranch || "unknown"}\``,
    `- Existing releases: ${context.existingReleases.length.toLocaleString()}`,
    `- Commits considered: ${context.commits.length.toLocaleString()} of ${context.commitCount.toLocaleString()}`,
    `- Omitted commits: ${context.omittedCommitCount.toLocaleString()}`,
    `- Changed files listed: ${context.changedFilesAtReleaseSha.length.toLocaleString()}`,
    `- Omitted files: ${context.omittedFileCount.toLocaleString()}`,
    `- Update existing releases: ${context.updateExisting}`,
    "",
    "## Plan Counts",
    "",
    `- Create: ${(counts.create || 0).toLocaleString()}`,
    `- Update: ${(counts.update || 0).toLocaleString()}`,
    `- Skip: ${(counts.skip || 0).toLocaleString()}`,
    "",
    "## Summary",
    "",
    summaryOverride || plan.summary || "",
    "",
    "## Proposed Actions",
    "",
    "| Action | Tag | Target | Title | Reason |",
    "| --- | --- | --- | --- | --- |",
    ...buildActionRows(plan.actions),
    "",
    "## Review Files",
    "",
    "- `release-plan.json` contains the normalized create/update/skip proposal.",
    "- `release-context.json` contains the bounded repository context sent for planning.",
    "- `existing-releases.raw.json`, `commits.tsv`, and `files.txt` contain source inventory data.",
    "",
    "Publication is controlled separately by `publish`; report-only runs do not create tags or releases."
  ]

  return `${lines.join("\n")}\n`
}

function main() {
  const artifactDir = process.env.RELEASE_ARTIFACT_DIR
  const context = JSON.parse(fs.readFileSync(path.join(artifactDir, "release-context.json"), "utf8"))
  const plan = JSON.parse(fs.readFileSync(path.join(artifactDir, "release-plan.json"), "utf8"))
  const markdown = buildSummaryMarkdown({ context, plan, summaryOverride: process.env.SUMMARY })

  fs.writeFileSync(path.join(artifactDir, "release-review-summary.md"), markdown)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
}

module.exports = { buildActionRows, buildSummaryMarkdown, countActionsByType, escapeCell, shortSha }

if (require.main === module) {
  main()
}
