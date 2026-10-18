"use strict"

const assert = require("node:assert/strict")
const fs = require("fs")
const os = require("os")
const path = require("path")
const { test } = require("node:test")

const { inspectWorkspace, readCodexSettings, setupWorkspace, writeCodexSettings } = require("./setup-workspace.js")

function createWorkspace() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-"))

  fs.mkdirSync(path.join(workspaceRoot, "shared-automation"))
  fs.writeFileSync(path.join(workspaceRoot, "shared-automation", "WORKSPACE_AGENTS.md"), "# Workspace\n")

  return { codexConfig: path.join(workspaceRoot, "codex", "config.toml"), workspaceRoot }
}

test("writeCodexSettings sets the two top-level keys and keeps every other setting", () => {
  const text = 'model = "a"\nproject_doc_max_bytes = 100\n\n[projects."x"]\ntrust_level = "trusted"\n'
  const written = writeCodexSettings(text)

  assert.equal(
    written,
    'model = "a"\nproject_doc_max_bytes = 262144\nproject_root_markers = [".agents-root"]\n\n[projects."x"]\ntrust_level = "trusted"\n'
  )
  assert.deepEqual(readCodexSettings(written), { maxBytes: 262144, markers: '[".agents-root"]' })
  assert.equal(writeCodexSettings(written), written)
})

test("writeCodexSettings keeps a project_doc_max_bytes larger than the minimum", () => {
  assert.equal(
    writeCodexSettings("project_doc_max_bytes = 524288\n"),
    'project_doc_max_bytes = 524288\nproject_root_markers = [".agents-root"]\n'
  )
})

test("setupWorkspace wires an empty workspace and inspectWorkspace then finds nothing missing", () => {
  const options = createWorkspace()

  // The workspace file exists, so the symlink, CLAUDE.md, marker, and both Codex settings are missing.
  assert.equal(inspectWorkspace(options).length, 5)
  setupWorkspace(options)
  assert.deepEqual(inspectWorkspace(options), [])
  assert.equal(fs.readFileSync(path.join(options.workspaceRoot, "AGENTS.md"), "utf8"), "# Workspace\n")
  setupWorkspace(options)
  assert.deepEqual(inspectWorkspace(options), [])
})

test("setupWorkspace refuses to replace a regular AGENTS.md or a CLAUDE.md with other content", () => {
  const options = createWorkspace()

  fs.writeFileSync(path.join(options.workspaceRoot, "AGENTS.md"), "local rules\n")
  assert.throws(() => setupWorkspace(options), /regular file/)
  fs.rmSync(path.join(options.workspaceRoot, "AGENTS.md"))
  fs.writeFileSync(path.join(options.workspaceRoot, "CLAUDE.md"), "# Notes\n")
  assert.throws(() => setupWorkspace(options), /other content/)
})
