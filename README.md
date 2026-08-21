# shared-automation

Shared GitHub Actions workflows and automation used across cyaris repositories.

This repository is the neutral home for reusable workflow implementations that should not live in an application or
library repository. Downstream repositories should keep thin local wrapper workflows that define when the workflow runs,
then call the reusable implementation here with `uses: cyaris/shared-automation/.github/workflows/<workflow>.yml@main`.

The reusable workflow implementations guard manual `workflow_dispatch` runs. By default, they only allow the
`cyaris` GitHub actor to run manually dispatched workflows; another actor will fail immediately before any checkout,
release, upload, or deployment work happens. Rollup additionally accepts `github-actions[bot]` so the repository's
scheduled upstream-watch workflow can dispatch a rebuild when a tracked dependency changes, but only after verifying
through the GitHub API that the supplied run reference is an authorized `upstream-watch.yml` run in the same
repository that was active when GitHub created the Rollup run; this is time-bounded authorization of that run reference,
not cryptographic proof that the referenced run issued the dispatch.

Reusable workflow and composite-action contracts use structured inputs such as booleans, paths, refs, file lists, and
validated spec lines. They avoid caller-provided shell command strings unless a documented repository need cannot be
expressed through fixed package scripts or structured configuration.

## Node Tooling

The root `package.json` covers the Node scripts under `.github/scripts/` that back `.github/workflows/auto-release.yml`.

- `npm run format` applies Prettier
- `npm run format:check` checks Prettier formatting
- `npm run lint` applies ESLint
- `npm test` runs the `node --test` suites
- `.prettierrc.cjs` and `eslint.config.mjs` define formatting and lint rules
- `.github/workflows/ci-self.yml` runs the format check, lint, and tests when the package changes

## Renovate

The shared preset in `default.json` prepares Renovate dependency automation. Participating repositories keep small local
`renovate.json` files that extend `github>cyaris/shared-automation`, so the preset centralizes common grouping,
scheduling, labels, and ignored generated paths while allowing repository-local overrides.

The shared preset covers:

- npm dependency and lockfile updates
- GitHub Actions and reusable workflow references
- lockfile maintenance before 6am on Mondays in `America/Chicago`
- grouped minor and patch npm updates for production and development dependencies
- grouped GitHub Actions updates, including `cyaris/shared-automation` workflow references
- generated and vendored path exclusions
  - `node_modules`
  - `_site`
  - `.svelte-kit`
  - `dist`
  - `build`
- the `actionlint` and `zizmor` versions pinned in `.github/workflows/workflow-validation.yml`, tracked through custom
  regex managers because shell commands install those tools instead of a package manifest

Third-party GitHub Actions should use hash pins with readable major-version comments, then rely on Renovate for future
updates. First-party reusable workflow callers keep `cyaris/shared-automation` refs on `main` so each run uses the latest
shared workflow implementation. Repository-specific action families, such as GitHub Pages actions in `cyaris.github.io`,
may stay on their own supported major versions when they do not overlap with shared workflow implementation actions.

Renovate automerge is not enabled. Dependency updates should arrive as reviewable pull requests unless a repository
adds an explicit local automerge policy later.

Remote setup is still required before Renovate runs. Install the Renovate GitHub App for each participating repository,
and grant the app access to `cyaris/shared-automation` so it can resolve the shared preset. For private repositories,
grant the app read access to both the target repository and this preset repository.

## Branch Model

Use `main` for stable reusable workflow definitions and `dev` for proposed changes. Dependent repositories should call
`@main` so they use the latest stable shared workflow commit at run time.

Future stable references should use this model:

- `@v1` for backward-compatible workflow-contract changes after the major tag is approved
- immutable release tags such as `@v1.2.0` when a caller needs a fixed release point
- exact commit SHAs for especially sensitive deployment paths or temporary staged rollouts
- `@v2` only for breaking workflow-contract changes

The auto-release workflow manages release reconciliation for this repository and callers that inherit the shared release
policy. Release runs decide meaningful release milestones from the repository history and policy instead of relying on
commit-prefix parsing.

## Workflows

### `.github/workflows/auto-create-dev-pr.yml`

Reusable workflow for opening a pull request from `dev` to the caller repository default branch after changes are pushed
to `dev`, when no such pull request already exists.

Typical caller wrapper:

```yaml
name: Auto-create dev pull request

on:
  push:
    branches:
      - dev

permissions:
  contents: read
  pull-requests: write

jobs:
  auto-create-dev-pr:
    uses: cyaris/shared-automation/.github/workflows/auto-create-dev-pr.yml@main
    secrets:
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
```

The reusable job serializes runs with a repository/branch-specific concurrency group. This queues overlapping pushes
before the pull request existence check and creation step run.

Important inputs:

- `default-branch`, defaulting to the caller repository default branch
- `dev-branch`, defaulting to `dev`
- `title` and `body` for caller-specific pull request text
- `allowed-dispatch-actor`, defaulting to `cyaris`

Optional secret:

- `RELEASE_TOKEN` for trusted user or agent-authored pull requests. When callers pass this secret, the workflow uses it
  for branch fetches and `gh pr create`.

### `.github/workflows/auto-create-dev-pr-self.yml`

Local workflow for this repository. It runs on pushes to `dev`, then delegates pull request creation to
`.github/workflows/auto-create-dev-pr.yml`.

### `.github/workflows/auto-release-self.yml`

Local workflow for this repository. It runs from manual dispatch only, then delegates release reconciliation to
`.github/workflows/auto-release.yml`.

### `.github/workflows/auto-release.yml`

Reusable release-reconciliation workflow for `workflow_call` consumers. It gathers the caller repository's commit
history through a selected commit, combines the shared release policy in this repository with optional caller policy
overrides, asks the configured OpenAI model which existing releases need updates and which missing release milestones
need creation, and can apply those changes when explicitly enabled.

The context-gathering, planning, and apply logic live in `.github/scripts/gather-release-context.js`,
`plan-release-reconciliation.js`, and `apply-release-reconciliation.js`. The `node --test` suites run through
`.github/workflows/ci-self.yml` and cover each script.

Typical caller wrapper:

```yaml
jobs:
  auto-release:
    uses: cyaris/shared-automation/.github/workflows/auto-release.yml@main
    permissions:
      contents: write
    with:
      publish: false
      update-existing: true
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
      CHECKOUT_TOKEN: ${{ secrets.CHECKOUT_TOKEN }}
```

Important inputs:

- `release-sha`, defaulting to the default branch tip, and `policy-path`
- `openai-model`, defaulting to `gpt-5-mini`
- `dry-run` for decision reporting without applying release changes, defaulting to `false`
- `publish` for creating and updating releases instead of only reporting the plan, defaulting to `false`
- `update-existing` for allowing edits to existing release titles and notes, defaulting to `true`
- `shared-automation-repository` and `shared-automation-ref` for the shared release policy checkout
- `allowed-dispatch-actor`, defaulting to `cyaris`

The workflow always reconciles against the caller repository's GitHub-reported default branch, with no override input;
GitHub Actions retains report-only review artifacts for 30 days.

The local `.github/workflows/auto-release-self.yml` wrapper uses the reusable defaults, so manual runs in this
repository are report-only unless `publish` is explicitly enabled.

Required secret:

- `OPENAI_API_KEY` for release reconciliation; missing secrets and failed OpenAI API requests fail the workflow

Optional secrets:

- `RELEASE_TOKEN` for release and tag creation
- `CHECKOUT_TOKEN` for reading private repositories used by the workflow

Every successful planning run writes a Markdown summary to the Actions run summary and uploads an artifact named
`release-review-<repo>-<sha>` containing:

- `release-review-summary.md`
- `release-plan.json`
- `release-context.json`
- `existing-releases.raw.json`
- `commits.tsv`
- `files.txt`

For multi-repository historical reviews:

1. keep `publish: false`
2. download each repository's artifact
3. compare the proposed create/update/skip actions
4. update the release policy or rerun with different inputs

GitHub Actions cannot edit propositions inside the running planning step, so publish in a later explicit run after
approving the plan.

### `.github/workflows/ci-self.yml`

Local workflow for this repository's own `.github/scripts` package. It runs through manual dispatch or on pushes to
`dev` and `main` that touch:

- `.github/scripts/**`
- `.github/workflows/ci-self.yml`
- `.github/workflows/ci.yml`
- `.gitignore`
- `.prettierrc.cjs`
- `eslint.config.mjs`
- `package.json`
- `package-lock.json`

The workflow delegates to `.github/workflows/ci.yml` with formatting, linting, and `npm test` enabled. It disables
`run-check` and `run-build` because this repository has no type-check or build step. The reusable workflow accepts a UI
dispatch only from `allowed-dispatch-actor` (default `cyaris`) and rejects any other actor before running checks.

### `.github/workflows/ci.yml`

Reusable Node package validation workflow. It checks out the caller repository, optionally checks out and builds local
`file:` dependency repositories, and runs `npm ci`. It then runs these fixed scripts unless the matching `run-*` flag
disables the step:

- `npm run format:check`
- `npm run lint`
- `npm run check`
- `npm test`
- `npm run build`

`run-test` defaults to `false` because not every caller declares a `test` script.

Typical caller wrapper:

```yaml
name: CI

on:
  push:
    branches:
      - dev
      - main
  workflow_dispatch:

jobs:
  node-package-ci:
    uses: cyaris/shared-automation/.github/workflows/ci.yml@main
    with:
      local-dependency-repositories: |
        cyaris/svelte-lib:svelte-lib:main
    secrets:
      CHECKOUT_TOKEN: ${{ secrets.CHECKOUT_TOKEN }}
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
```

Important inputs:

- `working-directory` and `node-version`
- standard-script flags; set one to `false` to skip its npm script
  - `run-format`
  - `run-lint`
  - `run-check`
  - `run-build`
- `run-test` to run `npm test`, defaulting to `false`
- optional `local-dependency-repositories` entries as `owner/repo:path:ref`
- `allowed-dispatch-actor`, defaulting to `cyaris`

When a caller supplies `local-dependency-repositories`, the workflow installs and builds those repositories before it
runs `npm ci`. This sequence keeps local `file:` dependencies usable even when Git ignores generated `dist/` output.

Optional secret:

- `CHECKOUT_TOKEN` for reading private dependency repositories

### `.github/workflows/rollup.yml`

Reusable Rollup workflow for Svelte apps that need both shared CI validation and embedded bundle uploads. It resolves
standard `svelte-lib` refs and local dependency refs to exact commit SHAs at run time, runs the shared CI workflow first,
then runs the shared rollup upload action. Caller wrappers must limit triggers to manual dispatches and pushes to `dev`,
`main`, or `master`. Each caller still owns:

- manual input declarations
- S3 destinations
- bundle lists
- extra dependency refs
- caller repository variables

Production-branch runs upload unprefixed `bundle.*` objects, while `dev` runs upload staged `test_bundle.*` objects.
This reusable workflow is not directly dispatchable from the GitHub Actions UI; manually run the caller repository's
local wrapper workflow instead. Human dispatches remain restricted to `allowed-dispatch-actor`; Rollup also accepts
`github-actions[bot]` for repository-controlled dispatches from upstream-watch; Rollup verifies them by looking up
`source-run-id` through the GitHub API rather than trusting the actor name alone.

Important inputs:

- CI inputs
  - `working-directory`
  - `node-version`
  - `run-format`
  - `run-lint`
  - `run-check`
  - `run-build`
- Upload inputs
  - `dist-directory`
  - `bundle-files`
  - `s3-bucket`
  - `s3-prefix`
  - `aws-region`
  - `aws-role-to-assume`
  - `manual-dry-run`
  - `sync-dist-extras`
  - `cache-control`
  - `metadata-refresh-files`
  - `svelte-lib-repository`
- Shared dependency input: `local-dependency-repositories` for dependencies used by both CI and upload
- `allowed-dispatch-actor`, defaulting to `cyaris`
- `source-run-id`, which upstream-watch's dispatch call populates automatically; not intended for manual use

The `github-actions[bot]` dispatch exception only applies when `source-run-id` resolves, through the GitHub API, to an
authorized `upstream-watch.yml` run in the same repository and the Rollup run's creation time falls within the source
run's lifetime. `source-run-id` is caller-supplied input, so this is time-bounded authorization of a legitimate run
reference, not cryptographic proof that the referenced run issued the dispatch; checking the creation time only limits
how long a valid run ID stays usable, even when upstream-watch finishes before Rollup gets a runner.

Automated dispatch requires:

- Caller job permissions:
  - `actions: read`
  - `contents: read`
  - `id-token: write`
- A caller `workflow_dispatch` input that declares and forwards `source-run-id`

Callers that only dispatch manually (`cyaris`) need neither change.

Rollup callers use branch refs such as `main` for first-party local dependencies by default. The workflow resolves those
refs once to the latest commit SHA before checking out dependencies. Dependencies listed in
`local-dependency-repositories` use `owner/repo:path:ref` entries, such as `cyaris/fireworks:fireworks:main`. The workflow
passes those dependencies to both CI and upload with the same resolved SHA, so production uploads use current upstream
code while preserving exact commit evidence in the run.

The composite upload implementation lives at `.github/actions/rollup-upload/action.yml`. AWS OIDC is the preferred
authentication path. Rollup caller repositories should store the role ARN in a repository variable such as
`AWS_ROLLUP_UPLOAD_ROLE_ARN`, pass it to `aws-role-to-assume`, and grant only `contents: read` and `id-token: write` on
the job that calls `.github/workflows/rollup.yml`. If `aws-role-to-assume` is blank, the action falls back to static AWS
access-key secrets. Dry runs validate that one of those credential paths exists, because a dry run should prove the
configured deployment credentials are available even though it does not write S3 objects.

Optional secrets:

- `CHECKOUT_TOKEN` for reading private dependency repositories
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` when `aws-role-to-assume` is omitted

Private dependency note: callers that install private repositories through local `file:` dependencies need a
checkout-capable token.

### `.github/workflows/upstream-watch.yml`

Reusable daily-cron watcher for repositories whose local `file:` dependencies can change without a new caller commit.
The workflow:

- resolves the same `svelte-lib` and `local-dependency-repositories` refs as `rollup.yml`
- compares each resolved ref with a repository variable that records the last-seen commit SHA
- dispatches the caller's `Rollup` workflow through `workflow_dispatch` when a dependency moves
- passes its run ID as `source-run-id` so Rollup can authorize the dispatch through the GitHub API

The workflow always compares `svelte-lib` against `main`. Each additional dependency must track `main`, `master`, or a
pinned commit SHA unless the caller enables `allow-nonproduction-refs`. A moving nonproduction branch could otherwise
trigger a live redeploy on unrelated activity; the watcher does not track pull requests individually.

Important inputs:

- `svelte-lib-repository`, defaulting to `cyaris/svelte-lib`
- `local-dependency-repositories` for additional dependencies to watch, in the same `owner/repo:path:ref` format used
  by `rollup.yml` — callers with a Rollup dependency list can pass the identical value; each checkout path is
  restricted to letters, digits, hyphens, and underscores since it becomes part of a repository variable name
- `allow-nonproduction-refs`, defaulting to `false` — set to `true` only for a documented, intentional need to watch a
  `local-dependency-repositories` entry on a ref other than `main`, `master`, or a pinned commit SHA
- `rollup-workflow-file`, the workflow file name in the caller repository to dispatch, defaulting to `rollup.yml`
- `dispatch-ref`, required, the branch to dispatch that workflow on
- `allowed-dispatch-actor`, defaulting to `cyaris`

The workflow derives each tracking variable from the dependency's checkout path:

- `svelte-lib` becomes `UPSTREAM_SVELTE_LIB_SHA`
- `fireworks` becomes `UPSTREAM_FIREWORKS_SHA`

The first run for a dependency seeds its variable without dispatching a rollup because no prior value exists. The
workflow updates the stored SHA as soon as the dispatch call succeeds, rather than waiting for the Rollup run to finish.
If Rollup later fails, its own run history records the failure; the next scheduled check does not retry it.

Required secret:

- `CHECKOUT_TOKEN` or `RELEASE_TOKEN`, used to read upstream commits and to read and write the caller repository's
  tracking variables. Unlike other reusable workflows, this one fails the run outright if neither secret is set, since
  it cannot do its job without one.

Private dependency note: `GITHUB_TOKEN` cannot write repository variables, so `CHECKOUT_TOKEN`/`RELEASE_TOKEN` must
carry enough scope for that in addition to reading the watched upstream repositories.

### `.github/workflows/workflow-validation.yml`

Reusable workflow validation for GitHub Actions and automation configuration. It runs on changes to workflow,
composite-action, release-policy, Renovate config, and automation documentation files in this repository.
Dependent repositories with meaningful local workflow logic can call it from a thin local wrapper.

Typical caller wrapper:

```yaml
name: Workflow validation

on:
  push:
    branches:
      - dev
      - main
    paths:
      - ".github/release-policy.yml"
      - ".github/workflows/**"
      - "renovate.json"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  workflow-validation:
    uses: cyaris/shared-automation/.github/workflows/workflow-validation.yml@main
```

Validation includes:

- GitHub Actions syntax and expression checks with `actionlint`
- JSON parsing for configured release and Renovate files
- GitHub Actions security analysis with `zizmor`

The shared `zizmor` run requires hash pins for third-party GitHub Actions but allows `cyaris/shared-automation` reusable
workflow callers to use normal branch or tag refs while maintainers prepare the stable major-tag model.

Important inputs:

- `json-files`, defaulting to `renovate.json`
- `allowed-dispatch-actor`, defaulting to `cyaris`

Pure thin-caller repositories do not need a local wrapper by default. Add one when a repository owns local shell logic,
deployment permissions, Pages deployment steps, rollup resolver behavior, or other workflow behavior that should be
validated before merge.
