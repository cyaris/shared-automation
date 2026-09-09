"use strict"

const fs = require("fs")

const VITE_KEY_PATTERN = /^VITE_[A-Z0-9_]+$/

function parseViteEnvironment(spec) {
  const entries = []
  const seenKeys = new Set()

  for (const line of String(spec || "").split("\n")) {
    if (!line.trim()) {
      continue
    }

    const separatorIndex = line.indexOf("=")

    if (separatorIndex < 0) {
      throw new Error("Invalid Vite public environment entry; expected VITE_NAME=value.")
    }

    const key = line.slice(0, separatorIndex)
    const value = line.slice(separatorIndex + 1)

    if (!VITE_KEY_PATTERN.test(key)) {
      throw new Error(`Invalid Vite public environment key: ${key}`)
    }

    if (!value) {
      throw new Error(`Vite public environment value is empty for ${key}.`)
    }

    if (seenKeys.has(key)) {
      throw new Error(`Duplicate Vite public environment key: ${key}`)
    }

    seenKeys.add(key)
    entries.push([key, value])
  }

  return entries
}

function formatEntries(entries) {
  return entries.map(([key, value]) => `${key}=${value}\0`).join("")
}

function main() {
  const outputPath = process.argv[2]

  if (!outputPath) {
    throw new Error("Usage: parse-vite-environment.js <output-file>")
  }

  fs.writeFileSync(outputPath, formatEntries(parseViteEnvironment(process.env.VITE_PUBLIC_ENVIRONMENT)))
}

module.exports = { formatEntries, parseViteEnvironment }

if (require.main === module) {
  try {
    main()
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  }
}
