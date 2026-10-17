"use strict"

const assert = require("node:assert/strict")
const { execFileSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")
const { test } = require("node:test")

const { readTopics, renderInherited, syncRepository } = require("./sync-agents.js")

function createRepository(root, name, files) {
  const repository = path.join(root, name)

  Object.entries(files).forEach(([file, text]) => {
    fs.mkdirSync(path.dirname(path.join(repository, file)), { recursive: true })
    fs.writeFileSync(path.join(repository, file), text)
  })
  execFileSync("git", ["init", "--quiet"], { cwd: repository })

  return repository
}

test("readTopics collects every marked topic and rejects a second definition", () => {
  const topics = readTopics([
    "<!-- topic: a -->\n## A\n\n- One\n<!-- /topic: a -->",
    "<!-- topic: b -->\n- Two\n<!-- /topic: b -->"
  ])

  assert.deepEqual(
    [...topics],
    [
      ["a", "## A\n\n- One"],
      ["b", "- Two"]
    ]
  )
  assert.throws(
    () => readTopics(["<!-- topic: a -->\nx\n<!-- /topic: a -->", "<!-- topic: a -->\ny\n<!-- /topic: a -->"]),
    /more than once/
  )
})

test("renderInherited replaces each block's text and fails on an unknown topic", () => {
  const text = "# Local\n\n<!-- inherit: lib/a -->\nstale\n<!-- /inherit: lib/a -->\n"

  assert.equal(
    renderInherited(text, () => "fresh"),
    "# Local\n\n<!-- inherit: lib/a -->\nfresh\n<!-- /inherit: lib/a -->\n"
  )
  assert.throws(() => renderInherited(text, () => undefined), /lib\/a does not exist/)
})

test("syncRepository fills nested blocks from a sibling repository and check mode leaves them unchanged", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sync-agents-"))

  createRepository(root, "lib", {
    "AGENTS.md": "# Lib\n\n<!-- topic: style -->\n## Style\n\n- Rule\n<!-- /topic: style -->\n"
  })
  const consumer = createRepository(root, "app", {
    "AGENTS.md": "# App\n",
    "frontend/AGENTS.md": "# Frontend\n\n<!-- inherit: lib/style -->\n<!-- /inherit: lib/style -->\n"
  })

  assert.deepEqual(syncRepository(consumer, { check: true }), ["frontend/AGENTS.md"])
  assert.equal(
    fs.readFileSync(path.join(consumer, "frontend/AGENTS.md"), "utf8"),
    "# Frontend\n\n<!-- inherit: lib/style -->\n<!-- /inherit: lib/style -->\n"
  )
  assert.deepEqual(syncRepository(consumer), ["frontend/AGENTS.md"])
  assert.match(
    fs.readFileSync(path.join(consumer, "frontend/AGENTS.md"), "utf8"),
    /<!-- inherit: lib\/style -->\n## Style\n\n- Rule\n<!-- \/inherit: lib\/style -->/
  )
  assert.deepEqual(syncRepository(consumer, { check: true }), [])

  // A tracked AGENTS.md deleted from the working tree is skipped rather than read.
  execFileSync("git", ["add", "."], { cwd: consumer })
  fs.rmSync(path.join(consumer, "AGENTS.md"))
  assert.deepEqual(syncRepository(consumer, { check: true }), [])
})
