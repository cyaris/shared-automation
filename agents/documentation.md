# Documentation

- Fix typos in documentation that you write and in existing nearby text that you edit.
- When the order of prose list items is not significant, arrange them alphabetically using case-insensitive comparison, with the uppercase item first when two items differ only by case. Preserve semantic, procedural, severity, and other meaningful orders.
- Keep GitHub Actions workflow sections as the final top-level section in caller README files.
- Keep README and AGENTS guidance focused on current behavior, active requirements, and durable project decisions. Remove
  migration-era notes, deprecated-option explanations, old fallback paths, and historical caveats once they no longer
  affect how someone uses, maintains, deploys, or releases the project. When a state change makes a requirement obsolete,
  update the affected docs and configuration in that same change. This removes content that has stopped being true, never
  an accurate statement of how the project works today: a fact stays documented while it holds, including when a tracked
  issue proposes replacing the behavior, and including when the same fact is stated in another section. Consolidate a
  genuine repetition by choosing which section owns it and keeping that one, rather than deleting both.
- Do not add repository-owned `CHANGELOG.md` files. Keep durable current behavior in README/AGENTS documentation and
  publish milestone history through GitHub release notes.
- Keep README link behavior intentional and consistent. Use standard Markdown links by default, and use HTML anchors
  with `target="_blank"` and `rel="noopener noreferrer"` only when links should explicitly open in a new tab.
- In README files and user-facing technical Markdown documentation, use bullets, subbullets, or a compact table whenever a
  sentence or paragraph enumerates three or more peer technical items, including files, paths, commands, flags, fields,
  tables, outputs, steps, requirements, metrics, dependencies, or triggers. Do not leave a concrete inventory as
  comma-separated prose merely because each item is short. Keep one item or a genuinely inseparable two-item phrase in
  prose. When aligning a README with these rules, audit existing touched sections for dense inline inventories instead
  of applying the rule only to new text.
- Do not use bullets solely to separate README command examples or other code-block sections. Introduce each code block
  with a short prose sentence instead.
- Do not place separate bullet groups directly next to each other when they document different concepts, because
  Markdown can render them as one list. Use prose, a table, or an explicit subsection label to separate the concepts.
- Keep each README bullet list focused on one kind of item. If a bullet stands out as metadata, a context note, an
  example, an identifier, or a behavior note rather than a peer of the surrounding bullets, move it into
  prose, a table, a new subsection, or a clearly labeled subbullet group.
- When README bullet items are sentence fragments, omit trailing periods. Keep periods for bullets that are complete
  sentences or contain multiple sentences.
- Avoid starting README bullets with ambiguous pronouns such as `it`, `this`, or `these` unless the noun is explicit in
  the same bullet. Repeat the noun when that makes the bullet clearer.
- Avoid vague README verbs such as `use`, `provide`, `support`, or `available` when the relationship can be named more
  directly. Prefer concrete wording that identifies the field, flag, table, file path, setting, destination, or UI
  behavior.
- Prefer active wording when it identifies the actor or operation more clearly, especially for ownership, workflow
  actions, requirements, generated outputs, and failure behavior. Keep passive or state-oriented wording when the actor
  is unknown, irrelevant, or less important than the resulting state; do not perform mechanical voice rewrites.
- When documenting multiple README tables, files, or generated outputs, describe each item separately when a shared
  description would become vague or hide meaningful differences.
- Do not restate a section's subject in the text directly beneath its heading. A heading that already names a file, such
  as `.github/workflows/rollup.yml` or `contact.html`, makes that restatement redundant, so the text below it opens with
  the verb: "Calls the shared rollup workflow with these local details:", not "The `Rollup` workflow calls the shared
  rollup workflow with these local details:". This applies to prose and bullets alike.
- Use prose instead of a bullet list when a section would contain only one bullet, unless the section heading already
  names the subject; prose would then have to restate that subject, so keep the single bullet and let it open with the
  verb. Prefer prose over subbullets when a nested list would have only two items, unless the pair needs extra visual
  separation to avoid ambiguity.
- When an example supports an existing README bullet, make the example a subbullet under that point even when there is
  only one example. Use `Example:` for one example and `Examples:` for multiple examples.
- Let table-of-contents nesting reflect the document structure even when a section has only two children.
- Keep documentation style guidance and future maintainer instructions in AGENTS.md instead of the README. The README should describe project behavior,
  commands, outputs, and user-facing effects rather than telling future editors what they should do. This covers durable
  standing conventions only, such as a step that must be repeated whenever a given file changes. Do not move an open work
  item into AGENTS.md: a `TODO`, a known gap, a planned migration, or an undecided design choice is tracked where the
  project already tracks work, such as a GitHub issue or the README note that already records it, because AGENTS.md
  states how the repository is maintained rather than what is still outstanding.
- In Markdown files, always format the literal as `null`.
- Before completing a change that adds or changes a user-followable link, verify the real target rather than relying
  on the URL's appearance. Check an internal destination in every route implementation that serves it. For an
  external destination, make a live request that follows redirects and confirm the final page is the intended one, not
  merely a non-404 response. Add focused regression coverage for the stable route or URL. If automation is blocked by
  login, bot protection, or another access restriction, perform and report the required manual check instead of
  claiming the link was verified.
- Keep private action and dependency access requirements documented in `README.md`.
- Keep every Markdown pipe table compact in source. This is required formatting, not a preference: separate columns
  with exactly one space on either side of each pipe, as in `Prop | Behavior` and `--- | ---:`, with no leading or
  trailing pipe. Never pad cells or lengthen separator dashes to align columns. Preserve only required alignment
  markers such as `---:`, `:---`, and `:---:`. When editing a document for any reason, preserve compact tables and
  restore compact formatting in every table touched by the change. Prettier pads every pipe table it formats, so never
  run Prettier, or any other formatter that rewrites tables, on a Markdown file. Keep Markdown out of a repository's
  `format` scripts and list it in `.prettierignore` so a direct `prettier --write` on a document is a no-op.
- Downstream README files should link to this repository's workflow descriptions instead of repeating shared behavior.
  For each local wrapper, document only the applicable local trigger and branch behavior, working directory, skipped
  commands, destination or S3 prefix, bundle files and naming, dependency refs, policy overrides, and required local
  variables or secrets. Then link to the shared workflow description for common behavior, inputs, and secrets.
- When a change affects product behavior, routes, architecture, APIs or data sources, data models, live or background
  behavior, or a meaningful edge case, update the Markdown document that owns that subject in the same change. Prefer an
  existing owner over a new document, and make no documentation-only change for a trivial implementation detail.
- Label documented functionality as implemented, partially implemented, or planned when its status could be
  ambiguous, and update the label when implementation changes, so planned behavior never reads as current.
- When a change makes a meaningful architectural decision, record the problem, the approved approach and its
  rationale, the alternatives considered, tradeoffs, and important edge cases in the document that owns that area. For
  a later replacement, document what changed and why rather than rewriting the earlier record.
