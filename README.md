# shared-automation

Shared GitHub Actions workflows and automation used across cyaris repositories.

This repository is the neutral home for reusable workflow implementations that should not live in an application or
library repository. Downstream repositories should keep thin local wrapper workflows that define when the workflow runs,
then call the reusable implementation here with `uses: cyaris/shared-automation/.github/workflows/<workflow>.yml@main`.

Manual `workflow_dispatch` runs are guarded by the reusable workflow implementations. By default, they only allow the
`cyaris` GitHub actor to run manually dispatched workflows; another actor will fail immediately before any checkout,
release, upload, or deployment work happens.

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
  pull_request:
  workflow_dispatch:

jobs:
  node-package-ci:
    uses: cyaris/shared-automation/.github/workflows/ci.yml@main
    with:
      local-dependency-repositories: |
        cyaris/svelte-lib:svelte-lib:${{ vars.SVELTE_LIB_REF || 'main' }}
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

### `.github/workflows/workflow-validation.yml`

Local workflow for this repository. It runs on changes to workflow, composite-action, release-policy, and automation
documentation files, then validates GitHub Actions syntax with `actionlint`, validates JSON automation config, and
audits workflow security with `zizmor`. The workflow can also be manually dispatched.

### `.github/workflows/rollup-upload.yml`

Reusable embedded bundle workflow. It checks out the caller repository, checks out `svelte-lib` as a local dependency,
checks out this repository for the composite upload action, then builds and uploads configured bundle files to S3.
It uploads only `bundle-files` by default; callers that need additional generated assets can opt into
`sync-dist-extras`.

The composite action implementation lives at `.github/actions/rollup-upload/action.yml`.

Important inputs:

- `working-directory` and `dist-directory`
- `bundle-files` as `path:content-type` lines
- `s3-bucket`, `s3-prefix`, and `aws-region`
- `aws-role-to-assume` for AWS OIDC authentication; using it requires `id-token: write`, and caller wrappers must not
  override the reusable workflow with stricter permissions
- `production`, `dry-run`, `sync-dist-extras`, `cache-control`, and `metadata-refresh-files`
- `shared-automation-repository` and `shared-automation-ref` for the composite action checkout
- `svelte-lib-repository` and `svelte-lib-ref` for the local `svelte-lib` dependency checkout
- optional `local-dependency-repositories` entries as `owner/repo:path:ref`
- `allowed-dispatch-actor`, defaulting to `cyaris`

Optional secrets:

- `CHECKOUT_TOKEN` for reading private dependency repositories
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` when `aws-role-to-assume` is omitted

Private dependency note: callers that install private repositories through local `file:` dependencies need a
checkout-capable token.

## Branch Model

Use `main` for stable reusable workflow definitions and `dev` for proposed changes. Dependent repositories should call
`@main` by default and use a pinned SHA only when they need a stable rollout point.
