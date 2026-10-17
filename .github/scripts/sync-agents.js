"use strict"

// Copies shared instruction topics into the AGENTS.md files that inherit them, so Codex and Claude read the same
// rules from the same files. A source repository marks each topic in one of its tracked AGENTS.md files:
//
//   <!-- topic: code-style -->
//   ...
//   <!-- /topic: code-style -->
//
// and an inheriting AGENTS.md holds a block that this script fills with the topic's current text:
//
//   <!-- inherit: shared-automation/code-style -->
//   <!-- /inherit: shared-automation/code-style -->
//
// Source repositories are resolved as siblings of the inheriting repository's root. With --check, the script changes
// nothing and exits 1 when any block differs from its topic.

const { execFileSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const INHERIT_PATTERN = /<!-- inherit: ([\w.-]+)\/([\w-]+) -->\n[\s\S]*?<!-- \/inherit: \1\/\2 -->/g
const TOPIC_PATTERN = /<!-- topic: ([\w-]+) -->\n([\s\S]*?)\n<!-- \/topic: \1 -->/g

function findRepositoryRoot(directory) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: directory, encoding: "utf8" }).trim()
}

function listAgentsFiles(repositoryRoot) {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "AGENTS.md", "**/AGENTS.md"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  })
    .split("\n")
    .filter(Boolean)
    .map(file => path.join(repositoryRoot, file))
    .filter(file => fs.existsSync(file))
}

function readTopics(texts) {
  const topics = new Map()

  texts.forEach(text => {
    for (const [, name, body] of text.matchAll(TOPIC_PATTERN)) {
      if (topics.has(name)) throw new Error(`Topic ${name} is defined more than once`)
      topics.set(name, body.trim())
    }
  })

  return topics
}

function renderInherited(text, resolveTopic) {
  return text.replace(INHERIT_PATTERN, (block, repository, topic) => {
    const body = resolveTopic(repository, topic)

    if (body === undefined) throw new Error(`Topic ${repository}/${topic} does not exist`)

    return `<!-- inherit: ${repository}/${topic} -->\n${body}\n<!-- /inherit: ${repository}/${topic} -->`
  })
}

function createTopicResolver(workspaceRoot) {
  const cache = new Map()

  return (repository, topic) => {
    if (!cache.has(repository)) {
      const root = path.join(workspaceRoot, repository)
      cache.set(repository, readTopics(listAgentsFiles(root).map(file => fs.readFileSync(file, "utf8"))))
    }

    return cache.get(repository).get(topic)
  }
}

function syncRepository(repositoryRoot, { check = false } = {}) {
  const resolveTopic = createTopicResolver(path.dirname(repositoryRoot))
  const stale = []

  listAgentsFiles(repositoryRoot).forEach(file => {
    const text = fs.readFileSync(file, "utf8")
    const rendered = renderInherited(text, resolveTopic)

    if (rendered == text) return
    stale.push(path.relative(repositoryRoot, file))
    if (!check) fs.writeFileSync(file, rendered)
  })

  return stale
}

function main(argv) {
  const check = argv.includes("--check")
  const directories = argv.filter(arg => arg != "--check")
  let failed = false

  ;(directories.length ? directories : [process.cwd()]).forEach(directory => {
    const repositoryRoot = findRepositoryRoot(directory)
    const stale = syncRepository(repositoryRoot, { check })

    stale.forEach(file => console.log(`${check ? "Out of date" : "Updated"}: ${path.basename(repositoryRoot)}/${file}`))
    if (check && stale.length) failed = true
  })

  if (failed) {
    console.error("Run sync-agents.js without --check to copy the current shared topics.")
    process.exitCode = 1
  }
}

if (require.main === module) main(process.argv.slice(2))

module.exports = { readTopics, renderInherited, syncRepository }
