"use strict"

const cp = require("child_process")
const fs = require("fs")

function selectActionableActions(plan) {
  return plan.actions.filter(action => action.action === "create" || action.action === "update")
}

function resolveLatestArgs(action, context) {
  return action.target_sha === context.releaseSha ? ["--latest"] : ["--latest=false"]
}

function resolveDefaultBranch(env) {
  return env.DEFAULT_BRANCH_INPUT || env.EVENT_DEFAULT_BRANCH || ""
}

function applyAction({ action, index, context, run, writeFile = fs.writeFileSync }) {
  const notesFile = `../release-notes-${index}.md`

  writeFile(notesFile, `${action.notes}\n`)
  run("git", ["cat-file", "-e", `${action.target_sha}^{commit}`])

  const defaultBranch = resolveDefaultBranch(process.env)

  if (defaultBranch) {
    run("git", ["merge-base", "--is-ancestor", action.target_sha, `origin/${defaultBranch}`])
  }

  if (action.action === "create") {
    let tagSha = ""

    try {
      tagSha = run("git", ["rev-list", "-n", "1", `refs/tags/${action.tag}^{}`]).trim()
    } catch {
      tagSha = ""
    }

    if (tagSha && tagSha !== action.target_sha) {
      throw new Error(`Release tag ${action.tag} points to ${tagSha}, not ${action.target_sha}`)
    }

    run("gh", [
      "release",
      "create",
      action.tag,
      "--target",
      action.target_sha,
      "--title",
      action.title,
      "--notes-file",
      notesFile,
      ...resolveLatestArgs(action, context)
    ])
  } else {
    run("gh", ["release", "edit", action.tag, "--title", action.title, "--notes-file", notesFile])
  }
}

function main() {
  const context = JSON.parse(fs.readFileSync("../release-context.json", "utf8"))
  const plan = JSON.parse(fs.readFileSync("../release-plan.json", "utf8"))
  const run = (command, args) => cp.execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

  const actions = selectActionableActions(plan)
  const applied = []
  const failed = []

  actions.forEach((action, index) => {
    try {
      applyAction({ action, index, context, run })
      applied.push({ action: action.action, tag: action.tag, target_sha: action.target_sha })
    } catch (error) {
      failed.push({
        action: action.action,
        tag: action.tag,
        target_sha: action.target_sha,
        message: error.stderr?.toString().trim() || error.message
      })
    }
  })

  fs.writeFileSync("../release-apply-results.json", JSON.stringify({ applied, failed }, null, 2))
  console.log(`Applied ${applied.length} release actions with ${failed.length} failures.`)

  if (failed.length) {
    for (const failure of failed) {
      console.error(`${failure.action} ${failure.tag} failed: ${failure.message}`)
    }

    process.exit(1)
  }
}

module.exports = { applyAction, resolveDefaultBranch, resolveLatestArgs, selectActionableActions }

if (require.main === module) {
  main()
}
