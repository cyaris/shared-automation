import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import importPlugin from "eslint-plugin-import"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import globals from "globals"

const commonjsFiles = ["*.cjs", "**/*.cjs", "*.js", "**/*.js"]
const moduleFiles = ["*.mjs", "**/*.mjs"]
const scriptFiles = [...commonjsFiles, ...moduleFiles]

export default [
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    files: commonjsFiles,
    languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: { ...globals.es2015, ...globals.node } }
  },
  {
    files: moduleFiles,
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.es2015, ...globals.node } }
  },
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "import/default": "off",
      "import/export": "off",
      "import/named": "off",
      "import/namespace": "off",
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",
      semi: ["error", "never"]
    }
  },
  {
    files: scriptFiles,
    rules: { "no-use-before-define": ["error", { functions: true, classes: true, variables: false }] }
  },
  prettier
]
