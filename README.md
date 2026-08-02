# shared-automation

Shared GitHub Actions workflows and automation used across cyaris repositories.

This repository is the neutral home for reusable workflow implementations that should not live in an application or
library repository. Downstream repositories should keep thin local wrapper workflows that define when the workflow runs,
then call the reusable implementation here with `uses: cyaris/shared-automation/.github/workflows/<workflow>.yml@main`.

Manual `workflow_dispatch` runs are guarded by the reusable workflow implementations. By default, they only allow the
`cyaris` GitHub actor to run manually dispatched workflows; another actor will fail immediately before any checkout,
release, upload, or deployment work happens.

Reusable workflow and composite-action contracts use structured inputs such as booleans, paths, refs, file lists, and
validated spec lines. They avoid caller-provided shell command strings unless a documented repository need cannot be
expressed through fixed package scripts or structured configuration.

## Renovate

Renovate dependency automation is prepared through the shared preset in `default.json`. Participating repositories keep
small local `renovate.json` files that extend `github>cyaris/shared-automation`, so common grouping, scheduling, labels,
and ignored generated paths stay centralized while repository-local overrides remain possible.

The shared preset covers:

- npm dependency and lockfile updates
- GitHub Actions and reusable workflow references
- lockfile maintenance before 6am on Mondays in `America/Chicago`
- grouped minor and patch npm updates for production and development dependencies
- grouped GitHub Actions updates, including `cyaris/shared-automation` workflow references
- generated and vendored path exclusions for `node_modules`, `_site`, `.svelte-kit`, `dist`, and `build`

Third-party GitHub Actions should use hash pins with readable major-version comments, then rely on Renovate for future
updates. First-party reusable workflow callers keep `cyaris/shared-automation` refs on `main` so each run uses the latest
shared workflow implementation. Repository-specific action families, such as GitHub Pages actions in `cyaris.github.io`,
may stay on their own supported major versions when they do not overlap with shared workflow implementation actions.

Renovate automerge is not enabled. Dependency updates should arrive as reviewable pull requests unless a repository
adds an explicit local automerge policy later.

Remote setup is still required before Renovate runs. Install the Renovate GitHub App for each participating repository,
and grant the app access to `cyaris/shared-automation` so it can resolve the shared preset. For private repositories,
the app must be allowed to read both the target repository and this preset repository.

## Branch Model

Use `main` for stable reusable workflow definitions and `dev` for proposed changes. Dependent repositories should call
`@main` so they use the latest stable shared workflow commit at run time.

Future stable references should use this model:

- `@v1` for backward-compatible workflow-contract changes after the major tag is approved
- immutable release tags such as `@v1.2.0` when a caller needs a fixed release point
- exact commit SHAs for especially sensitive deployment paths or temporary staged rollouts
- `@v2` only for breaking workflow-contract changes

The historical auto-release workflow remains the backfill and repair tool. Release Please manages future
`shared-automation` releases after the `v1.1.0` handoff point recorded in `release-please-config.json`.

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
```

The reusable job serializes runs with a repository/branch-specific concurrency group. This queues overlapping pushes
before the pull request existence check and creation step run.

Important inputs:

- `default-branch`, defaulting to the caller repository default branch
- `dev-branch`, defaulting to `dev`
- `title` and `body` for caller-specific pull request text
- `allowed-dispatch-actor`, defaulting to `cyaris`

Optional secret:

- `RELEASE_TOKEN` only when repository Actions settings cannot allow the run-scoped token to create pull requests

### `.github/workflows/auto-create-dev-pr-self.yml`

Local workflow for this repository. It runs on pushes to `dev`, then delegates pull request creation to
`.github/workflows/auto-create-dev-pr.yml`.

### `.github/workflows/auto-release-self.yml`

Local workflow for this repository. It runs from manual dispatch only, then delegates release reconciliation to
`.github/workflows/auto-release.yml`.

### `.github/workflows/release-please.yml`

Local workflow for future releases in this repository. It runs on pushes to `main` and manual dispatches by `cyaris`,
then uses Release Please with `release-please-config.json` and `.release-please-manifest.json`.

The config starts after the historical `v1.1.0` release SHA, so Release Please does not republish already reconciled
history. Release Please opens release pull requests and publishes releases after those pull requests are merged.

Dependent repositories use small repository-local Release Please workflows with the official action directly rather than
a reusable shared wrapper. Their local `release-please-config.json` files own the historical handoff SHA and manifest
version, which keeps future release ownership close to each repository and avoids another indirection layer.

### `.github/workflows/auto-release.yml`

Reusable release-reconciliation workflow for `workflow_call` consumers. It gathers the caller repository's commit
history through a selected commit, combines the shared release policy in this repository with optional caller policy
overrides, asks the configured OpenAI model which existing releases should be updated and which missing release
milestones should be created, and can apply those changes when explicitly enabled.

Typical caller wrapper:

```yaml
jobs:
  auto-release:
    uses: cyaris/shared-automation/.github/workflows/auto-release.yml@main
    permissions:
      contents: write
      issues: write
      pull-requests: write
    with:
      publish: false
      update-existing: true
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
      CHECKOUT_TOKEN: ${{ secrets.CHECKOUT_TOKEN }}
```

Important inputs:

- `release-sha`, `pr-number`, `policy-path`, and `default-branch`
- `openai-model`, defaulting to `gpt-5-mini`
- `dry-run` for decision reporting without applying release changes, defaulting to `false`
- `publish` for applying selected release creates and updates, defaulting to `false`
- `update-existing` for allowing edits to existing release titles and notes, defaulting to `true`
- `review-artifact-retention-days` for retaining report-only plan artifacts, defaulting to `30`
- `shared-automation-repository` and `shared-automation-ref` for the shared release policy checkout
- `allowed-dispatch-actor`, defaulting to `cyaris`

The local `.github/workflows/auto-release-self.yml` wrapper uses the reusable defaults, so manual runs in this
repository are report-only unless `publish` is explicitly enabled.

Required secret:

- `OPENAI_API_KEY` for release reconciliation; missing secrets and failed OpenAI API requests fail the workflow

Optional secrets:

- `RELEASE_TOKEN` for release and tag creation
- `CHECKOUT_TOKEN` for reading private repositories used by the workflow

Every successful planning run writes a Markdown review summary to the Actions run summary and uploads a review artifact
named `release-review-<repo>-<sha>`. The artifact includes `release-review-summary.md`, `release-plan.json`,
`release-context.json`, `existing-releases.raw.json`, `commits.tsv`, and `files.txt`. Multi-repository historical review
runs should keep `publish: false`, download the review artifacts from each repository run, compare the proposed
create/update/skip actions, then respond by updating release policy or rerunning with different inputs. GitHub Actions
does not support editing propositions inside the running planning step; publication should be a later explicit run after
the reviewed plan is approved.

### `.github/workflows/ci.yml`

Reusable Node package validation workflow. It checks out the caller repository, optionally checks out and builds
local `file:` dependency repositories, runs `npm ci`, then runs the fixed `npm run format:check`, `npm run lint`,
`npm run check`, and `npm run build` scripts unless the matching `run-*` flag disables that step.

Typical caller wrapper:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
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
- `run-format`, `run-lint`, `run-check`, and `run-build`; set a flag to `false` to skip that standard npm script
- optional `local-dependency-repositories` entries as `owner/repo:path:ref`
- `allowed-dispatch-actor`, defaulting to `cyaris`

When `local-dependency-repositories` is used, those repositories are installed and built before the caller runs `npm ci`.
This keeps local `file:` dependencies usable even when generated `dist/` output is ignored by Git.

Optional secret:

- `CHECKOUT_TOKEN` for reading private dependency repositories

### `.github/workflows/rollup.yml`

Reusable Rollup workflow for Svelte apps that need both shared CI validation and embedded bundle uploads. It resolves
standard `svelte-lib` refs and additional local dependency refs to exact commit SHAs at run time, runs the shared CI
workflow first, then runs the shared rollup upload action only for manual dispatches or pushes to `main` or `master`.
Caller wrappers still own triggers, manual input declarations, S3 destinations, bundle lists, extra dependency refs, and
caller repository variables.

Important inputs:

- CI inputs: `working-directory`, `node-version`, `run-format`, `run-lint`, `run-check`, `run-build`, and
  `additional-ci-local-dependency-repositories`
- Upload inputs: `dist-directory`, `bundle-files`, `s3-bucket`, `s3-prefix`, `aws-region`, `aws-role-to-assume`,
  `manual-production`, `manual-dry-run`, `sync-dist-extras`, `cache-control`, `metadata-refresh-files`,
  `svelte-lib-repository`, and `rollup-local-dependency-repositories`
- `allowed-dispatch-actor`, defaulting to `cyaris`

Rollup callers use branch refs such as `main` for first-party local dependencies by default. The workflow resolves those
refs to the latest commit SHA before checking out dependencies, so production uploads use current upstream code while
preserving exact commit evidence in the run.

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

### `.github/workflows/workflow-validation.yml`

Reusable workflow validation for GitHub Actions and automation configuration. It runs on changes to workflow,
composite-action, release-policy, release config, Renovate config, and automation documentation files in this repository.
Dependent repositories with meaningful local workflow logic can call it from a thin local wrapper.

Typical caller wrapper:

```yaml
name: Workflow validation

on:
  push:
    branches:
      - main
    paths:
      - ".github/release-policy.yml"
      - ".github/workflows/**"
      - ".release-please-manifest.json"
      - "release-please-config.json"
      - "renovate.json"
  pull_request:
    paths:
      - ".github/release-policy.yml"
      - ".github/workflows/**"
      - ".release-please-manifest.json"
      - "release-please-config.json"
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

The shared `zizmor` run keeps hash-pinning required for third-party GitHub Actions, but allows
`cyaris/shared-automation` reusable workflow callers to use normal branch or tag refs while the stable major-tag model is
being prepared.

Important inputs:

- `json-files`, defaulting to `.release-please-manifest.json`, `release-please-config.json`, and `renovate.json`
- `allowed-dispatch-actor`, defaulting to `cyaris`

Pure thin-caller repositories do not need a local wrapper by default. Add one when a repository owns local shell logic,
deployment permissions, Pages deployment steps, rollup resolver behavior, or other workflow behavior that should be
validated before merge.
