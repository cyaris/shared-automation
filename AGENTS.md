# Repository Instructions

## Scope And Inheritance

- Repositories that call workflows or actions from `cyaris/shared-automation` inherit this `AGENTS.md` as the source of truth for shared GitHub Actions, reusable workflow wrappers, release policy, dispatch, automation documentation, and general README/Markdown documentation style.
- Treat the automation rules in this file as scoped to automation behavior, and the general README/Markdown style rules in the Documentation section as scoped to any caller repository's README and Markdown documentation. Project-specific build commands, dependency refs, bundle files, S3 prefixes, release naming, milestone wording, deployment targets, and project-specific documentation content belong in the caller repository's own `AGENTS.md` or `.github/release-policy.yml`.
- When a caller repository inherits these rules, keep a local `AGENTS.md` note that points back to `../shared-automation/AGENTS.md` for both automation conventions and README/documentation-style conventions, then list only the caller-specific automation and documentation details that differ from the shared defaults.

## Workflow Ownership And Caller Expectations

- Keep reusable workflow implementations in `.github/workflows`.
- Keep composite GitHub Actions in `.github/actions`.
- Keep shared CI, rollup, auto-create-dev-PR, and auto-release implementation changes in this repository. Caller repositories should keep thin local wrapper workflows that define triggers, permissions, inputs, secrets, and repository-specific values before calling the reusable workflow here.
- Keep reusable workflow defaults general. Caller-specific commands, local dependency refs, bundle file lists, metadata refresh files, branch selections, S3 prefixes, and release naming or milestone overrides belong in caller workflow inputs or caller release-policy files.
- First-party upstream refs should track the latest production branch by default. Reusable workflow callers may use
  `cyaris/shared-automation` refs on `main`. Rollup local dependencies should use branch refs such as `main` unless a
  repository documents an intentional override; dependencies needed by both CI and upload should be listed in
  `local-dependency-repositories`, and the shared Rollup workflow resolves those refs to exact commit SHAs during each
  run before checkout and upload.
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

- Document every workflow and composite action in `README.md` when adding, renaming, or changing it in a way that affects callers.
- Keep GitHub Actions workflow sections as the final top-level section in caller README files.
- Keep README and AGENTS guidance focused on current behavior, active requirements, and durable project decisions. Remove
  migration-era notes, deprecated-option explanations, old fallback paths, and historical caveats once they no longer
  affect how someone uses, maintains, deploys, or releases the project. When a state change makes a requirement obsolete,
  update the affected docs and configuration in that same change.
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
- Use prose instead of a bullet list when a section would contain only one bullet. Prefer prose over subbullets when a
  nested list would have only two items, unless the pair needs extra visual separation to avoid ambiguity.
- When an example supports an existing README bullet, make the example a subbullet under that point even when there is
  only one example. Use `Example:` for one example and `Examples:` for multiple examples.
- Let table-of-contents nesting reflect the document structure even when a section has only two children.
- Keep documentation style guidance in AGENTS.md instead of the README.
- Keep future maintainer instructions in AGENTS.md instead of the README. The README should describe project behavior,
  commands, outputs, and user-facing effects rather than telling future editors what they should do.
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
  unprefixed bundle names. Pushes or manual dispatches from `dev` should run staged uploads with `test_bundle.*` names.
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

- Keep `.github/workflows/workflow-validation.yml` aligned with workflow and composite-action changes so `actionlint` and
  `zizmor` run when automation files change.
- Add workflow-validation callers to dependent repositories when they own meaningful local workflow logic, such as
  deployment jobs, rollup input-resolution shell, local permissions decisions, or nontrivial Pages workflows. Avoid
  adding validation wrappers solely for repositories that contain only thin calls to shared workflows.
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
