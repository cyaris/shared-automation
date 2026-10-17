# Code Style

These rules apply to tracked, nonignored source files in every language. Skip generated, vendored, build-output, and
ignored files, such as `.svelte-kit/` or `dist/`, unless a task explicitly requires refreshing them. Language topics
add to them: `python-sql.md` here and `../svelte-lib/agents/javascript.md`.

- Follow the installed formatter, import sorter, and linter rather than hand-formatting against their output. After
  changing code in a repository that defines formatting or lint validation, run every applicable validation and
  address its findings.
- Write comments only when they materially clarify necessary context. Fix typos in comments that you write or edit
  nearby.
- Inline local variables referenced only once and functions with only one caller unless a separate name is materially
  useful for clarity, behavior, or correctness. Separation of concerns alone does not justify a single-use helper when
  its caller remains clear and manageable after inlining. Retain a single-use variable or function only for a concrete
  reason, such as substantial complexity, meaningful semantic abstraction, independent testing value, genuinely
  expected reuse, avoiding duplicated evaluation or side effects, or measured performance. Do not mechanically inline
  code when that would make a function excessively large or materially harder to understand. Staying within the
  formatter's line length is not such a reason: let the formatter wrap inlined code.
- Prefer an existing module- or component-scope variable over passing the same invariant value through internal helper
  parameters. Keep parameters for values that genuinely vary by call, define a reusable public utility's input
  contract, or make a dependency explicit for isolation or testing. Do not introduce mutable application-wide state
  merely to shorten a function signature.
- Group consecutive statements by purpose with one blank line between groups. Keep statements together when they are
  the same kind or directly sequentially related. A standalone comment counts as the separator, so do not also add a
  blank line immediately before it. Do not make cleanup changes that only alter blank lines or line breaks; apply this
  grouping when the surrounding code is being changed substantively or the formatter requires it.
- When order has no semantic, dependency, source-order, or configuration-defined meaning, arrange lists, object or
  dictionary keys, named definitions, and other code collections alphabetically. Compare code case-sensitively with
  uppercase before lowercase, and let the formatter, import sorter, linter, or another installed ordering tool take
  precedence.
- Keep imports at the top of a module. Defer an import into a function only to break a circular dependency or when the
  module must run without a genuinely optional dependency. Let the installed formatter, import sorter, or linter
  determine import ordering. When none owns it, sort imports alphabetically and group package imports above project
  imports with one blank line between them, preserving CSS import order because it can affect the cascade.
- Declare every installed dependency in the owning package's or project's dependency file rather than relying on the
  local environment or a transitive dependency.
- Format user-facing or human-readable logged numeric quantities with thousands separators, through `.toLocaleString()`
  in JavaScript or a `,` format specifier such as `f"{count:,d}"` in Python. Do not apply numeric formatting to
  identifiers, to other values whose digits are not quantities, or to structured log fields a parser or metrics
  pipeline consumes, because the separators make them locale-dependent strings.
- Treat a valid `0` as data and keep `null` distinct from zero. Use finite-value checks rather than truthiness for
  numeric values, and coalesce a missing value to `0` only when coverage or derivation proves it is zero, so a display
  can show it as unknown.
