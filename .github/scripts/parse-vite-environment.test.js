"use strict"

const assert = require("node:assert/strict")
const { test } = require("node:test")

const { formatEntries, parseViteEnvironment } = require("./parse-vite-environment.js")

test("parseViteEnvironment returns no entries for unset or blank input", () => {
  assert.deepEqual(parseViteEnvironment(undefined), [])
  assert.deepEqual(parseViteEnvironment(""), [])
  assert.deepEqual(parseViteEnvironment("\n   \n"), [])
})

test("parseViteEnvironment keeps entry order and skips blank lines", () => {
  const entries = parseViteEnvironment("VITE_ONE=first\n\nVITE_TWO=second\n")

  assert.deepEqual(entries, [
    ["VITE_ONE", "first"],
    ["VITE_TWO", "second"]
  ])
})

test("parseViteEnvironment splits on the first equals sign only", () => {
  assert.deepEqual(parseViteEnvironment("VITE_URL=https://example.com/?a=b c"), [
    ["VITE_URL", "https://example.com/?a=b c"]
  ])
})

test("parseViteEnvironment rejects an entry without a separator", () => {
  assert.throws(
    () => parseViteEnvironment("VITE_ONE"),
    /Invalid Vite public environment entry; expected VITE_NAME=value\./
  )
})

test("parseViteEnvironment rejects keys outside the VITE_ namespace", () => {
  assert.throws(() => parseViteEnvironment("AWS_SECRET=value"), /Invalid Vite public environment key: AWS_SECRET/)
  assert.throws(() => parseViteEnvironment("VITE_lower=value"), /Invalid Vite public environment key: VITE_lower/)
  assert.throws(() => parseViteEnvironment("VITE_=value"), /Invalid Vite public environment key: VITE_/)
  assert.throws(() => parseViteEnvironment(" VITE_ONE=value"), /Invalid Vite public environment key: {2}VITE_ONE/)
})

test("parseViteEnvironment rejects an empty value", () => {
  assert.throws(() => parseViteEnvironment("VITE_ONE="), /Vite public environment value is empty for VITE_ONE\./)
})

test("parseViteEnvironment rejects a duplicated key", () => {
  assert.throws(
    () => parseViteEnvironment("VITE_ONE=first\nVITE_ONE=second"),
    /Duplicate Vite public environment key: VITE_ONE/
  )
})

test("formatEntries writes NUL-terminated KEY=value records", () => {
  assert.equal(
    formatEntries([
      ["VITE_ONE", "first"],
      ["VITE_TWO", "second line"]
    ]),
    "VITE_ONE=first\0VITE_TWO=second line\0"
  )
  assert.equal(formatEntries([]), "")
})
