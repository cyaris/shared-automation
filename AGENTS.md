# Repository Instructions

## Scope And Inheritance

- Repositories that call workflows or actions from `cyaris/shared-automation` may use this `AGENTS.md` as the source of truth for shared GitHub Actions, reusable workflow wrapper, release-policy, dispatch, and automation documentation conventions.
- Treat these shared rules as scoped to automation behavior. Project-specific build commands, dependency refs, bundle files, S3 prefixes, release naming, milestone wording, deployment targets, and documentation style rules belong in the caller repository's own `AGENTS.md` or `.github/release-policy.yml`.
- When a caller repository inherits these rules, keep a local `AGENTS.md` note that points back to `../shared-automation/AGENTS.md`, then list only the caller-specific automation details that differ from the shared defaults.

## Shared Workflow Implementations

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
- Do not move a repository-specific workflow implementation into this repository unless another repository will share the same behavior.
- Manual `workflow_dispatch` paths must remain restricted to the `cyaris` GitHub actor by default.

## Documentation

- Document every workflow and composite action in `README.md` when adding, renaming, or changing it in a way that affects callers.
- Keep GitHub Actions workflow sections as the final top-level section in caller README files.
- Keep README and AGENTS guidance focused on current behavior, active requirements, and durable project decisions. Remove
  migration-era notes, deprecated-option explanations, old fallback paths, and historical caveats once they no longer
  affect how someone uses, maintains, deploys, or releases the project. When a state change makes a requirement obsolete,
  update the affected docs and configuration in that same change.
- Document each reusable workflow's trigger model, purpose, caller-facing inputs, required secrets, optional secrets, dispatch behavior, and caller expectations.
- Document whether a workflow can be dispatched from the GitHub Actions UI and how it is dispatched when UI dispatch is not available.
- Keep private action and dependency access requirements documented in `README.md`.
- Keep README Markdown tables compact in source. Do not pad table cells or separator rows solely to align columns;
  preserve only required alignment markers such as `---:`, `:---`, or `:---:`.
- Downstream README files should link to this repository's workflow descriptions instead of repeating shared behavior.
  Keep repo-specific details downstream, such as trigger branches, working directories, S3 prefixes, bundle file lists,
  dependency refs, skipped commands, and required repository variables or secrets.
- For auto-create-dev-pr caller README sections, describe the local trigger branch and target branch, then link to the
  shared workflow description for behavior, inputs, and secrets.
- For auto-release caller README sections, describe that the local workflow is manual-only and any repository-specific
  release policy or default branch behavior, then link to the shared workflow description for reconciliation behavior,
  inputs, and secrets.
- For CI caller README sections, describe local triggers, working directories, skipped commands, and dependency ref
  fallbacks, then link to the shared workflow description for validation behavior, inputs, and secrets.
- Keep reusable workflow and composite-action contracts on structured inputs such as booleans, paths, refs, file lists,
  and validated spec lines. Do not expose arbitrary shell command strings as caller inputs unless a documented caller
  need cannot be expressed through fixed package scripts or structured configuration; keep shared CI validation on fixed
  npm scripts controlled by boolean inputs.
- For rollup caller README sections, describe the local CI triggers, upload trigger, S3 destination, bundle files,
  production or staged naming, and repository-specific dependency refs, then link to the shared workflow description for
  combined CI and upload behavior, inputs, and secrets.
- For workflow-validation caller README sections, describe that the local wrapper validates repository-owned workflow
  logic, then link to the shared workflow description for actionlint, JSON config, and zizmor behavior.

## Caller Workflow Expectations

- Caller repositories should keep root `Rollup`, `Auto-create dev pull request`, and `Auto release` workflows as thin callers of this repository's reusable workflows whenever those shared workflows cover the needed behavior.
- Auto-create-dev-pr callers with a repository `RELEASE_TOKEN` secret should pass that secret explicitly to the shared
  workflow. Use that token for trusted user or agent-authored dev PRs so downstream pull-request checks do not require
  manual approval solely because the pull request was opened by `github-actions[bot]`.
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
- Keep non-Rollup `dev` push triggers only for workflows whose purpose is specifically dev-branch automation, such as
  `auto-create-dev-pr`. CI, build, Pages, and workflow-validation jobs should rely on pull-request checks for
  dev-to-production changes and production-branch push checks after merge unless a repository documents a specific need.

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
