"use strict"

// Recreates the files outside any repository that make every repository under the workspace read
// WORKSPACE_AGENTS.md: the workspace AGENTS.md symlink, its CLAUDE.md, the .agents-root marker Codex finds the
// workspace by, and the Codex settings that use it. Every rule lives in this repository, so a new machine needs only
// its checkouts and one run of this script. With --check, it changes nothing and exits 1 when anything is missing.

const fs = require("fs")
const os = require("os")
const path = require("path")

const CLAUDE_TEXT = "@AGENTS.md\n"
const MAX_BYTES = 262144
const ROOT_MARKER = ".agents-root"

function topLevelEnd(text) {
  const table = text.search(/^\[/m)

  return table == -1 ? text.length : table
}

function readCodexSettings(text) {
  const top = text.slice(0, topLevelEnd(text))

  return {
    maxBytes: Number(top.match(/^project_doc_max_bytes\s*=\s*(\d+)/m)?.[1] ?? 0),
    markers: top.match(/^project_root_markers\s*=\s*(\[.*\])/m)?.[1]
  }
}

// Sets the two top-level Codex keys without touching any other setting, inserting them before the first table. A
// larger existing project_doc_max_bytes is kept.
function writeCodexSettings(text) {
  let top = text.slice(0, topLevelEnd(text))
  const rest = text.slice(topLevelEnd(text))
  const maxBytes = Math.max(readCodexSettings(text).maxBytes, MAX_BYTES)
  const lines = [`project_doc_max_bytes = ${maxBytes}`, `project_root_markers = ["${ROOT_MARKER}"]`]

  top = top.replace(/^project_doc_max_bytes\s*=.*\n?/m, "").replace(/^project_root_markers\s*=.*\n?/m, "")
  top = top.replace(/\n*$/, top.trim() ? "\n" : "")

  return `${top}${lines.join("\n")}\n${rest.length ? "\n" : ""}${rest}`
}

function inspectWorkspace({ codexConfig, workspaceRoot }) {
  const problems = []
  const agents = path.join(workspaceRoot, "AGENTS.md")
  const claude = path.join(workspaceRoot, "CLAUDE.md")
  const target = path.join("shared-automation", "WORKSPACE_AGENTS.md")

  if (!fs.existsSync(path.join(workspaceRoot, target))) problems.push(`${target} is missing`)
  if (!fs.lstatSync(agents, { throwIfNoEntry: false })?.isSymbolicLink() || fs.readlinkSync(agents) != target) {
    problems.push(`AGENTS.md must link to ${target}`)
  }
  if (!fs.existsSync(claude) || fs.readFileSync(claude, "utf8") != CLAUDE_TEXT)
    problems.push("CLAUDE.md must contain only @AGENTS.md")
  if (!fs.existsSync(path.join(workspaceRoot, ROOT_MARKER))) problems.push(`${ROOT_MARKER} is missing`)

  const settings = readCodexSettings(fs.existsSync(codexConfig) ? fs.readFileSync(codexConfig, "utf8") : "")

  if (settings.markers?.replace(/\s/g, "") != `["${ROOT_MARKER}"]`)
    problems.push(`Codex project_root_markers must be ["${ROOT_MARKER}"]`)
  if (settings.maxBytes < MAX_BYTES) problems.push(`Codex project_doc_max_bytes must be at least ${MAX_BYTES}`)

  return problems
}

// Refuses to replace a regular AGENTS.md or a CLAUDE.md with other content, since either may hold someone's rules.
function setupWorkspace({ codexConfig, workspaceRoot }) {
  const agents = path.join(workspaceRoot, "AGENTS.md")
  const claude = path.join(workspaceRoot, "CLAUDE.md")
  const target = path.join("shared-automation", "WORKSPACE_AGENTS.md")
  const agentsStat = fs.lstatSync(agents, { throwIfNoEntry: false })

  if (agentsStat && !agentsStat.isSymbolicLink())
    throw new Error(`${agents} is a regular file. Move its rules, then rerun.`)
  if (fs.existsSync(claude) && !["", CLAUDE_TEXT].includes(fs.readFileSync(claude, "utf8"))) {
    throw new Error(`${claude} has other content. Move it, then rerun.`)
  }
  if (agentsStat) fs.unlinkSync(agents)
  fs.symlinkSync(target, agents)
  fs.writeFileSync(claude, CLAUDE_TEXT)
  fs.writeFileSync(path.join(workspaceRoot, ROOT_MARKER), "")
  fs.mkdirSync(path.dirname(codexConfig), { recursive: true })
  fs.writeFileSync(
    codexConfig,
    writeCodexSettings(fs.existsSync(codexConfig) ? fs.readFileSync(codexConfig, "utf8") : "")
  )
}

function main(argv) {
  const options = {
    codexConfig: path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "config.toml"),
    workspaceRoot: path.resolve(__dirname, "../../..")
  }

  if (!argv.includes("--check")) setupWorkspace(options)

  const problems = inspectWorkspace(options)

  problems.forEach(problem => console.error(problem))
  if (problems.length) process.exitCode = 1
  else console.log(`Workspace instructions are wired in ${options.workspaceRoot}`)
}

if (require.main === module) main(process.argv.slice(2))

module.exports = { inspectWorkspace, readCodexSettings, setupWorkspace, writeCodexSettings }
