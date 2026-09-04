"use strict"

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const TAG_PATTERN = /^v[0-9]+(\.[0-9]+){0,2}([._-][A-Za-z0-9]+)?$/

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "actions"],
  properties: {
    summary: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["action", "tag", "target_sha", "title", "notes", "reason"],
        properties: {
          action: { type: "string", enum: ["create", "update", "skip"] },
          tag: { type: "string" },
          target_sha: { type: "string" },
          title: { type: "string" },
          notes: { type: "string" },
          reason: { type: "string" }
        }
      }
    }
  }
}

const SYSTEM_PROMPT = [
  "You reconcile GitHub releases for an entire repository commit history.",
  "Use the base release policy, then apply local release policy overrides.",
  "Compare every commit from the repository root through releaseSha with the existing releases.",
  "Create actions for meaningful missing release milestones between existing release targets.",
  "Update actions may improve existing release titles or notes, but must keep the existing tag and target_sha.",
  "Skip routine maintenance, formatting, minor refactoring, and small dependency chores unless their combined impact is significant.",
  "Tags must be stable version tags, must be unique, must not contain spaces or slashes, and should normally start with v.",
  "Release notes should be concise and useful to users and future maintainers.",
  "Return only JSON that matches the provided schema."
].join(" ")

function buildRequestBody({ context, model }) {
  return {
    model,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(context, null, 2) }
    ],
    text: {
      format: { type: "json_schema", name: "release_reconciliation_plan", strict: true, schema: RESPONSE_SCHEMA }
    }
  }
}

function extractOutputText(data) {
  return (
    data.output_text ||
    (data.output || []).flatMap(item => item.content || []).find(content => content.type === "output_text")?.text
  )
}

function normalizeActions(rawActions) {
  return (Array.isArray(rawActions) ? rawActions : []).map(action => ({
    action: String(action.action || "").trim(),
    tag: String(action.tag || "").trim(),
    target_sha: String(action.target_sha || "").trim(),
    title: String(action.title || "")
      .replace(/\s+/g, " ")
      .trim(),
    notes: String(action.notes || "").trim(),
    reason: String(action.reason || "")
      .replace(/\s+/g, " ")
      .trim()
  }))
}

function validateActions(normalizedActions, context) {
  const existingTags = new Set(context.existingReleases.map(release => release.tag))
  const commitShas = new Set(context.commits.map(commit => commit.sha))
  const seenCreateTags = new Set()
  const seenTargetShas = new Set()

  for (const action of normalizedActions) {
    if (action.action === "skip") {
      continue
    }

    if (action.action === "create") {
      if (!TAG_PATTERN.test(action.tag) || action.tag.includes("..")) {
        throw new Error(`Invalid release tag: ${action.tag}`)
      }
      if (!commitShas.has(action.target_sha)) {
        throw new Error(`Release target is outside the reconciled history: ${action.tag} ${action.target_sha}`)
      }
      if (!action.title) {
        throw new Error(`Release title cannot be empty for ${action.tag}`)
      }
      if (!action.notes) {
        throw new Error(`Release notes cannot be empty for ${action.tag}`)
      }
      if (existingTags.has(action.tag)) {
        throw new Error(`Create action targets an existing release tag: ${action.tag}`)
      }
      if (seenCreateTags.has(action.tag)) {
        throw new Error(`Duplicate create action for tag: ${action.tag}`)
      }
      if (seenTargetShas.has(action.target_sha)) {
        throw new Error(`Multiple create actions target the same commit: ${action.tag} ${action.target_sha}`)
      }
      seenCreateTags.add(action.tag)
      seenTargetShas.add(action.target_sha)
    } else if (action.action === "update") {
      if (!context.updateExisting) {
        action.action = "skip"
        action.reason = `Existing release updates are disabled. ${action.reason}`.trim()
        continue
      }
      if (!action.title) {
        throw new Error(`Release title cannot be empty for update action ${action.tag}`)
      }
      if (!action.notes) {
        throw new Error(`Release notes cannot be empty for update action ${action.tag}`)
      }

      const release = context.existingReleases.find(item => item.tag === action.tag)

      if (!release) {
        throw new Error(`Update action targets a missing release tag: ${action.tag}`)
      }
      if (!release.targetSha) {
        throw new Error(`Could not resolve the existing release target for update action ${action.tag}`)
      }
      if (release.targetSha !== action.target_sha) {
        throw new Error(`Update action cannot move ${action.tag} from ${release.targetSha} to ${action.target_sha}`)
      }
    } else {
      throw new Error(`Unsupported release action: ${action.action}`)
    }
  }

  return normalizedActions
}

function buildSummaryDelimiter(summary) {
  let delimiter = ""

  do {
    delimiter = `SUMMARY_${crypto.randomBytes(12).toString("hex")}`
  } while (summary.includes(delimiter))

  return delimiter
}

async function main() {
  const artifactDir = process.env.RELEASE_ARTIFACT_DIR
  const context = JSON.parse(fs.readFileSync(path.join(artifactDir, "release-context.json"), "utf8"))
  const body = buildRequestBody({ context, model: process.env.OPENAI_MODEL })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)

  let responseText
  let response

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    responseText = await response.text()
  } catch (error) {
    throw new Error(`OpenAI API request could not be completed: ${error.message}`)
  } finally {
    clearTimeout(timeout)
  }

  let data

  try {
    data = responseText ? JSON.parse(responseText) : {}
  } catch {
    data = { raw: responseText.slice(0, 1000) }
  }

  if (!response.ok) {
    const apiMessage = data?.error?.message || response.statusText || "unknown error"

    throw new Error(`OpenAI API request returned ${response.status}: ${apiMessage}`)
  }

  const outputText = extractOutputText(data)

  if (!outputText) {
    throw new Error(`OpenAI response did not include output text: ${JSON.stringify(data)}`)
  }

  const plan = JSON.parse(outputText)

  plan.summary = String(plan.summary || "").trim()
  plan.actions = validateActions(normalizeActions(plan.actions), context)

  fs.writeFileSync(path.join(artifactDir, "release-plan.json"), JSON.stringify(plan, null, 2))

  const createCount = plan.actions.filter(action => action.action === "create").length
  const updateCount = plan.actions.filter(action => action.action === "update").length
  const delimiter = buildSummaryDelimiter(plan.summary)

  fs.appendFileSync(process.env.GITHUB_OUTPUT, `create_count=${createCount}\n`)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `update_count=${updateCount}\n`)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `summary<<${delimiter}\n${plan.summary}\n${delimiter}\n`)
}

module.exports = {
  RESPONSE_SCHEMA,
  SYSTEM_PROMPT,
  TAG_PATTERN,
  buildRequestBody,
  buildSummaryDelimiter,
  extractOutputText,
  normalizeActions,
  validateActions
}

if (require.main === module) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
