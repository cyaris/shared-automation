# Workflows

## Workflow Ownership And Caller Expectations

- Keep shared AWS CDK deployment, CI, rollup, auto-create-dev-PR, and auto-release implementation changes in this repository. Caller repositories should keep thin local wrapper workflows that define triggers, permissions, inputs, secrets, and repository-specific values before calling the reusable workflow here.
- Keep reusable workflow defaults general. Caller-specific commands, local dependency refs, bundle file lists, metadata refresh files, branch selections, S3 prefixes, and release naming or milestone overrides belong in caller workflow inputs or caller release-policy files.
- First-party upstream refs should track the latest production branch by default. Reusable workflow and composite-action
  callers must use `cyaris/shared-automation` refs on `main`, including when a new downstream caller temporarily fails
  because its required shared feature exists only on `dev`. Rollup local dependency specs should name production refs
  such as `main`
  unless a repository documents an intentional override; the shared Rollup workflow substitutes `dev` for those
  production refs when the caller runs on `dev`, then resolves every selected ref to an exact commit SHA before checkout
  and upload. Dependencies needed by both CI and upload should be listed in `local-dependency-repositories`. Rollup
  checks out `svelte-lib` from the separate `svelte-lib-repository` and `svelte-lib-ref` inputs instead of that list,
  applying the same `dev` substitution and SHA pinning.
- Do not hardcode commit SHAs or substitute a feature branch in first-party `cyaris/*` reusable workflow,
  composite-action, or source dependency references to expose an upstream feature before it reaches the referenced
  production branch. Keep caller configuration on the appropriate `main` or `master` production-branch contract; exact
  SHAs resolved internally by a workflow for a single reproducible run are not hardcoded caller references. Third-party
  GitHub Actions remain SHA-pinned under the security rule below.
- When a downstream change needs an upstream feature that is not yet available on its configured production branch,
  tell the user before publication that the downstream workflow, build, or runtime will fail until upstream lands. Keep
  the downstream reference on the production branch and publish it when requested; do not conceal the dependency by
  pinning the unpublished commit or changing the caller to an upstream feature branch.
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

## Workflow Behavior

- Do not disable a shared CI standard-script flag (`run-format`, `run-lint`, `run-check`, `run-build`) unless the caller
  defines no such npm script, and document that reason where the wrapper is described. A caller that defines the script
  runs it; skipping one silently removes coverage every other caller has.
- Auto-create-dev-pr callers should pass `CHECKOUT_TOKEN` so the shared workflow can write the `DEV_PR_OPEN`
  repository variable, and should pass a repository `RELEASE_TOKEN` secret, when present, for trusted user or
  agent-authored dev pull requests. Callers must also trigger on production-branch pushes and keep the shared
  `DEV_PR_OPEN` job-level skip so `dev` pushes do not start a runner while a dev pull request is open.
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
- For rollup upload callers, `dev` pushes should not run Rollup. Pushes from `main` or `master` should run production
  uploads with unprefixed bundle names. Manual or trusted upstream-watch dispatches from `dev` should run staged uploads
  with `dev_bundle.*` names.
- When a Rollup caller needs a temporary deployment-readiness gate, pass the shared `deployment-enabled` input. Keep the
  caller job active so shared CI still runs, and apply the gate only to the shared upload job.
- Do not trigger GitHub Actions workflows from pull-request events. `auto-create-dev-pr` is the only workflow that runs
  automatically on `dev` pushes; run pre-merge CI, build, Pages, and workflow-validation checks on `dev` through manual
  dispatch, and retain production-branch push checks after merge.

## Dependency Automation

- Keep shared Renovate defaults in `default.json`. Participating repositories should keep local `renovate.json` files as
  thin wrappers that extend `github>cyaris/shared-automation`, then add repository-specific overrides only when the
  shared preset cannot describe a durable local need.

## Workflow Validation And Security

- Add workflow-validation callers to dependent repositories when they own meaningful local workflow logic, such as
  deployment jobs, rollup input-resolution shell, local permissions decisions, secret wiring, dispatch inputs,
  concurrency behavior, or nontrivial Pages workflows. A thin reusable-workflow caller still owns meaningful local
  logic when it declares any of those behaviors. Avoid adding validation wrappers solely for repositories whose local
  workflows are completely declarative calls without security-sensitive or behavioral configuration.
- Treat `actionlint` failures as workflow contract or syntax issues to fix before rollout.
- Treat `zizmor` findings as security-review prompts. Fix true positives, document accepted risks, and avoid broad
  suppressions.
- Keep third-party GitHub Actions hash-pinned when `zizmor` requires it. First-party reusable workflow callers may use
  `cyaris/shared-automation` refs on `main` so callers pick up the latest shared workflow implementation.
- Extract non-trivial inline Node.js logic out of `run:` heredocs into standalone files under `.github/scripts/`,
  covered by `node --test`, rather than leaving security-relevant or otherwise complex logic untested inside a workflow
  step. Wire the reusable CI workflow's `run-test` input to run those tests before rollout.
