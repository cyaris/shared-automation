# Repository Instructions

## Scope And Inheritance

- Repositories that call workflows or actions from `cyaris/shared-automation` inherit this `AGENTS.md` as the source of truth for shared GitHub Actions, reusable workflow wrappers, release policy, dispatch, automation documentation, and general README/Markdown documentation style. Repositories with Python or SQL may also opt into the shared language conventions below.
- Treat the automation rules in this file as scoped to automation behavior, the general README/Markdown style rules in the Documentation section as scoped to any caller repository's README and Markdown documentation, and the Python/SQL rules as scoped only to repositories whose local `AGENTS.md` explicitly inherits them. Project-specific build commands, dependency refs, bundle files, S3 prefixes, release naming, milestone wording, deployment targets, and project-specific documentation content belong in the caller repository's own `AGENTS.md` or `.github/release-policy.yml`.
- When a caller repository inherits these rules, keep a local `AGENTS.md` note that points back to `../shared-automation/AGENTS.md` for the applicable shared conventions, then list only caller-specific details that differ from the shared defaults.

## Shared Python And SQL Conventions

- Apply these conventions to tracked and nonignored Python and SQL source files. Skip generated, vendored, build-output, and ignored files unless a task explicitly requires them.
- Follow the repository's configured formatter, import sorter, and linter rather than hand-formatting against their output. After changing Python or SQL in a repository that defines formatting or lint validation commands, run every applicable validation and address its findings.
- Write comments only when they materially clarify necessary context. Fix typos in comments that you write or edit nearby.
- Do not define a local variable if it is referenced only once unless its name materially improves clarity or the variable is needed for correctness; otherwise, inline its value. Line wrapping alone does not justify a single-use variable.
- Group consecutive statements by purpose with one blank line between groups. Keep statements together when they are the same kind or directly sequentially related; a standalone comment counts as the separator, so do not also add a blank line immediately before it solely to create separation.
- When order has no semantic, dependency, source-order, or configuration-defined meaning, arrange lists, dictionary keys, named definitions, and other code collections alphabetically. Compare code case-sensitively with uppercase before lowercase, and let the formatter, import sorter, linter, or another installed ordering tool take precedence.
- Format user-facing or human-readable logged numeric quantities with thousands separators. In Python, include `,` in the format specifier, such as `f"{count:,d}"` or `f"{count:,}"`. Do not apply numeric formatting to identifiers, to other values whose digits are not quantities, or to structured log fields a parser or metrics pipeline consumes, because the separators make them locale-dependent strings.
- Declare every installed dependency in the owning project's dependency file rather than relying on the local environment or a transitive dependency.

### Python

- Format Python with the repository's Black and isort settings.
- Keep imports at the top of a module. Defer an import into a function only to break a circular dependency or when the module must run without a genuinely optional dependency. Let isort determine import ordering; its output takes precedence over manual ordering.
- Leave a blank line immediately before every `return` unless the return is the first statement in the function body, the immediate body of an `if`/`elif`/`else` guard, or immediately follows a multiline string assignment.
- Omit a bare `return` only when control would naturally reach the end of the function at that point. Keep or add a bare `return` for an intentional early exit that prevents later statements from running, and do not write `return None` for a no-value return.
- Follow an `if`/`elif`/`else` statement with a blank line before the next statement unless it is the last statement in its block. A standalone comment immediately after the conditional counts as that separation, so do not also add a blank line before the comment.
- Before formatting, remove trailing commas that serve no syntactic purpose. Keep a comma when syntax requires it or when Black restores it to preserve the formatted layout; judge nested collections independently because Black may collapse them separately.
- Indent the contents of a multiline triple-quoted string to the indentation of its opening delimiter. When the opening delimiter shares a line with a statement, use that statement's indentation; when the delimiter stands on its own as a nested argument, align the contents with the delimiter rather than dedenting them.

### SQL

- Write SQL operations and keywords in lowercase.
- Put each clause, such as `select`, `from`, `where`, `group by`, `order by`, and `limit`, on its own line. A query may remain on one line only when it is a single-item `select` from one table with no other clauses.
- Keep a clause with one item on one line. For multi-item `select` and named-column `group by` clauses, put the keyword on its own line and each item on its own line one indentation level deeper. Keep positional `group by` items inline regardless of count.
- Keep `order by` items inline unless there are at least five named columns or the line would exceed Black's configured line length; then put each item on its own indented line. Positional `order by` items remain inline regardless of count.
- Format an `insert` target-column list as a parenthesized multi-item list with one indented column per line and the closing `)` appended to the last column, followed by a blank line before the supplying `select` or `values`. Lists of three or fewer columns and lists that fit within Black's configured line length may remain inline.
- Treat a single interpolated placeholder that expands to multiple clause items or target columns as one written item: keep it beside the clause keyword or inline within the parentheses.
- For `where`, `having`, and `qualify`, keep a single condition beside the keyword. With multiple conditions, put the keyword on its own line, put each operand on its own indented line, and begin continuation lines with `and` or `or`.
- Break only the outermost boolean level when nested parenthesized groups contain only simple leaf conditions. When a parenthesized group contains another parenthesized boolean group, break that containing group too and indent one additional level per nesting level.
- Prefer `qualify` over a subquery or CTE used only to filter a window function's result.
- Keep a function-call calculation on one line, including an entire window `over (...)` clause and nested aggregate or scalar calls, even when the line is long.
- Keep a join and its first `on` condition on the same line. With multiple join conditions, put each additional condition on its own line, aligned beneath the first condition with the leading `and` or `or` extending to its left.
- Do not alias a query that reads from only one relation. When aliases are needed, assign sequential single-letter aliases `a`, `b`, `c`, and so on in table order, restarting at `a` in each query scope.
- Omit optional operators and keywords that have no effect, including `as` between a selected value and its alias. Retain required syntax such as the `as` in a CTE definition.
- Cast with `::` rather than `cast(... as ...)`.
- In `group by`, use selected-column positions rather than names or calculations whenever possible.
- Put a blank line before a `select` that begins on a new line.
- Prefer a descriptively named CTE over a derived-table subquery in `from` or `join`, but use as few CTEs as practical and fold a one-use projection or simple row-shaping step into its immediate consumer when that remains clear and does not duplicate logic or change table grain.
- Format a `with` clause with `with` on its own line and blank lines after `with`, between CTE definitions, and before the outer query. Write each CTE as `<name> as (` on its own line, leave a blank line before its inner query, keep the inner query at the statement's base indentation, and append the closing `)` and any separating comma to the inner query's final line.

## Workflow Ownership And Caller Expectations

- Keep reusable workflow implementations in `.github/workflows`.
- Keep composite GitHub Actions in `.github/actions`.
- Keep shared CI, rollup, auto-create-dev-PR, and auto-release implementation changes in this repository. Caller repositories should keep thin local wrapper workflows that define triggers, permissions, inputs, secrets, and repository-specific values before calling the reusable workflow here.
- Keep reusable workflow defaults general. Caller-specific commands, local dependency refs, bundle file lists, metadata refresh files, branch selections, S3 prefixes, and release naming or milestone overrides belong in caller workflow inputs or caller release-policy files.
- First-party upstream refs should track the latest production branch by default. Reusable workflow callers may use
  `cyaris/shared-automation` refs on `main`. Rollup local dependency specs should name production refs such as `main`
  unless a repository documents an intentional override; the shared Rollup workflow substitutes `dev` for those
  production refs when the caller runs on `dev`, then resolves every selected ref to an exact commit SHA before checkout
  and upload. Dependencies needed by both CI and upload should be listed in `local-dependency-repositories`. Rollup
  checks out `svelte-lib` from the separate `svelte-lib-repository` and `svelte-lib-ref` inputs instead of that list,
  applying the same `dev` substitution and SHA pinning.
- Do not hardcode commit SHAs in first-party `cyaris/*` reusable workflow, composite-action, or source dependency
  references to expose an upstream feature before it reaches the referenced branch. Keep caller configuration on the
  appropriate `main`, `master`, or documented `dev` branch contract; exact SHAs resolved internally by a workflow for a
  single reproducible run are not hardcoded caller references. Third-party GitHub Actions remain SHA-pinned under the
  security rule below.
- When a downstream change needs an upstream feature that is not yet available on its configured branch, tell the user
  before publication that the downstream workflow, build, or runtime will fail until upstream lands. Publish and merge
  the upstream change first, then publish the downstream change; do not silently pin the unpublished upstream commit or
  knowingly publish the broken downstream caller unless the user explicitly directs that exception.
- Keep the default release policy in this repository. Caller repositories should add `.github/release-policy.yml` only for project-specific overrides, not to reintroduce shared release implementation logic.
- Keep release boundary decisions in the shared auto-release workflow and release-policy files. Caller repositories should
  not add separate release automation unless the user explicitly asks for a repository-specific exception.
- Keep root `Rollup`, `Auto-create dev pull request`, and `Auto release` workflows as thin callers whenever the shared
  workflows cover the needed behavior.
- Do not move a repository-specific workflow implementation into this repository unless another repository will share the same behavior.
- Manual `workflow_dispatch` paths must remain restricted to the `cyaris` GitHub actor by default. Trusted Rollup
  dispatches from the repository's upstream-watch workflow may also allow `github-actions[bot]`, gated on Rollup
  verifying via the GitHub API that the supplied `source-run-id` references an authorized `upstream-watch.yml` run in
  the same repository that was active when GitHub created the Rollup run. This is time-bounded authorization of a
  legitimate run ID, not verified provenance: `source-run-id` is caller-supplied input, so it does not cryptographically
  prove which workflow actually issued the dispatch. Do not extend that automation exception to other actors or
  workflows, and do not grant `actions: write` to additional workflows in this repository, without first closing that
  gap (for example, with a `workflow_run` trigger).

## Documentation

- Fix typos in documentation that you write and in existing nearby text that you edit.
- When the order of prose list items is not significant, arrange them alphabetically using case-insensitive comparison, with the uppercase item first when two items differ only by case. Preserve semantic, procedural, severity, and other meaningful orders.
- Document every workflow and composite action in `README.md` when adding, renaming, or changing it in a way that affects callers.
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
- Keep documentation style guidance in AGENTS.md instead of the README.
- Keep future maintainer instructions in AGENTS.md instead of the README. The README should describe project behavior,
  commands, outputs, and user-facing effects rather than telling future editors what they should do. This covers durable
  standing conventions only, such as a step that must be repeated whenever a given file changes. Do not move an open work
  item into AGENTS.md: a `TODO`, a known gap, a planned migration, or an undecided design choice is tracked where the
  project already tracks work, such as a GitHub issue or the README note that already records it, because AGENTS.md
  states how the repository is maintained rather than what is still outstanding.
- In Markdown files, always format the literal as `null`.
- Document each reusable workflow's trigger model, purpose, caller-facing inputs, required secrets, optional secrets, dispatch behavior, and caller expectations.
- Document whether a workflow can be dispatched from the GitHub Actions UI and how it is dispatched when UI dispatch is not available.
- Keep private action and dependency access requirements documented in `README.md`.
- Format Markdown pipe tables with exactly one space inside each cell boundary, such as `| Prop | Behavior |` and
  `| --- | ---: |`. Start and end each row with `|`, without leading or trailing whitespace outside those pipes, and do
  not add extra padding solely to align columns. Preserve required alignment markers such as `---:`, `:---`, and
  `:---:`.
- Downstream README files should link to this repository's workflow descriptions instead of repeating shared behavior.
  For each local wrapper, document only the applicable local trigger and branch behavior, working directory, skipped
  commands, destination or S3 prefix, bundle files and naming, dependency refs, policy overrides, and required local
  variables or secrets. Then link to the shared workflow description for common behavior, inputs, and secrets.
- Keep reusable workflow and composite-action contracts on structured inputs such as booleans, paths, refs, file lists,
  and validated spec lines. Do not expose arbitrary shell command strings as caller inputs unless a documented caller
  need cannot be expressed through fixed package scripts or structured configuration; keep shared CI validation on fixed
  npm scripts controlled by boolean inputs.
- Do not disable a shared CI standard-script flag (`run-format`, `run-lint`, `run-check`, `run-build`) unless the caller
  defines no such npm script, and document that reason where the wrapper is described. A caller that defines the script
  runs it; skipping one silently removes coverage every other caller has.
- Auto-create-dev-pr callers with a repository `RELEASE_TOKEN` secret should pass that secret explicitly to the shared
  workflow. Use that token for trusted user or agent-authored dev pull requests.
- Workflows must fail clearly when a requested feature requires credentials, secrets, repository variables, external
  permissions, or paid services that are not configured. Apply this to dry-run modes too: a dry run may avoid external
  writes, but it should still prove that required credentials exist unless the feature is explicitly documented as
  credential-optional.
- Do not hide required workflow failures with `continue-on-error: true`, `|| true`, warning-only error handlers,
  harmless default outputs, or skipped jobs. Intentional no-op paths are fine when the work is genuinely unnecessary,
  such as no release action being needed or no dev pull request being possible, but missing configuration and failed
  required operations should end in a failed step or job with enough context to debug the cause.
- Keep scheduled workflows simple. Prefer one schedule away from the top of the hour over multiple UTC schedules plus a
  local-time gate, unless the repository truly needs exact local-time behavior. If a schedule is only approximate, let
  the job run and document the chosen UTC time instead of creating helper jobs that make expected runs appear skipped.
- Prefer AWS OIDC for deployment workflows. Reusable workflows and caller jobs that pass `aws-role-to-assume` must grant
  `id-token: write`; static AWS access-key secrets may remain only as a compatibility fallback until callers have
  repository-specific OIDC roles configured.
- Write clear, specific commit subjects that describe the actual change. Prefer plain language over release-tool syntax,
  and do not exaggerate routine maintenance as user-facing work.
- Treat upstream automation, shared workflow reference, dependency-pin, Renovate, and release-policy maintenance as
  non-release work unless it changes repository user behavior or a published package/runtime API.
- For rollup upload callers, pushes or manual dispatches from `main` or `master` should run production uploads with
  unprefixed bundle names. Pushes or manual dispatches from `dev` should run staged uploads with `dev_bundle.*` names.
- When a Rollup caller needs a temporary deployment-readiness gate, pass the shared `deployment-enabled` input. Keep the
  caller job active so shared CI still runs, and apply the gate only to the shared upload job.
- Do not trigger GitHub Actions workflows from pull-request events. Run pre-merge CI, build, Pages, and
  workflow-validation checks from `dev` pushes, and retain production-branch push checks after merge.

## Release Management

- Use the default policy in `.github/release-policy.yml` unless a caller has a durable project-specific override in its
  own `.github/release-policy.yml`. Keep version and title formats in policy files rather than duplicating them in
  `AGENTS.md`.
- Evaluate whether accumulated changes form a meaningful release milestone. Substantial user-facing features,
  architecture changes, important reliability, security, accessibility, performance, or compatibility improvements,
  and coherent groups of material changes may warrant a release. Routine maintenance, formatting, minor refactors,
  isolated dependency updates, and small fixes normally do not.
- When a release may be warranted, explain the milestone, suggest a policy-consistent title and tag, summarize release
  notes and migration concerns, and recommend full release, prerelease, or draft status.
- Treat work on PR or development branches as a release candidate. The final tag should normally point to the merge
  commit on `main` or `master` unless the user explicitly approves another branch.
- Do not create, rename, move, or delete tags or publish a GitHub release unless the user explicitly requests it.

## Dependency Automation

- Keep shared Renovate defaults in `default.json`. Participating repositories should keep local `renovate.json` files as
  thin wrappers that extend `github>cyaris/shared-automation`, then add repository-specific overrides only when the
  shared preset cannot describe a durable local need.
- Configure Renovate to manage npm dependencies, GitHub Actions, reusable workflow references, lockfile maintenance,
  Node versions declared in workflow inputs, and any future Docker files that Renovate can detect natively.
- Do not enable Renovate automerge by default. Dependency updates should remain reviewable pull requests unless a
  repository has an explicit low-risk automerge policy.
- Keep generated, vendored, and build-output paths out of Renovate scans, including `node_modules`, `_site`,
  `.svelte-kit`, `dist`, and `build`.
- Document Renovate GitHub App installation and access requirements before claiming dependency automation is active for
  a repository.

## Workflow Validation And Security

- Never merge a pull request unless the user explicitly instructs you to merge that specific pull request or an
  unambiguous identified set of pull requests. Requests to fix, finish, deploy, publish, investigate, make checks green,
  or continue do not authorize a merge; neither do green checks, review completion, mergeability, or prior authorization
  for a different pull request. When a pull request is ready without explicit merge authorization, leave it open and
  report its readiness.
- Keep `.github/workflows/workflow-validation.yml` aligned with workflow and composite-action changes so `actionlint` and
  `zizmor` run when automation files change.
- Add workflow-validation callers to dependent repositories when they own meaningful local workflow logic, such as
  deployment jobs, rollup input-resolution shell, local permissions decisions, secret wiring, dispatch inputs,
  concurrency behavior, or nontrivial Pages workflows. A thin reusable-workflow caller still owns meaningful local
  logic when it declares any of those behaviors. Avoid adding validation wrappers solely for repositories whose local
  workflows are completely declarative calls without security-sensitive or behavioral configuration.
- Before merging any pull request, explicitly inspect CodeRabbit comments and reviews and assess every still-applicable
  finding; do not merge solely because checks are green.
- Treat `actionlint` failures as workflow contract or syntax issues to fix before rollout.
- Treat `zizmor` findings as security-review prompts. Fix true positives, document accepted risks, and avoid broad
  suppressions.
- Keep third-party GitHub Actions hash-pinned when `zizmor` requires it. First-party reusable workflow callers may use
  `cyaris/shared-automation` refs on `main` so callers pick up the latest shared workflow implementation.
- Extract non-trivial inline Node.js logic out of `run:` heredocs into standalone files under `.github/scripts/`,
  covered by `node --test`, rather than leaving security-relevant or otherwise complex logic untested inside a workflow
  step. Wire the reusable CI workflow's `run-test` input to run those tests before rollout.
