# shared-automation

Shared GitHub Actions workflows and automation used across cyaris repositories.

This repository is the neutral home for reusable workflow implementations that should not live in an application or
library repository. Downstream repositories should keep thin local wrapper workflows that define when the workflow runs,
then call the reusable implementation here with `uses: cyaris/shared-automation/.github/workflows/<workflow>.yml@main`.
This repository is public, so child repositories do not need a private checkout token just to read these reusable
workflow files.

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
    secrets:
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
```

Important inputs:

- `default-branch`, defaulting to the caller repository default branch
- `dev-branch`, defaulting to `dev`
- `title` and `body` for caller-specific pull request text
- `allowed-dispatch-actor`, defaulting to `cyaris`

Optional secret:

- `RELEASE_TOKEN` for repositories where `github.token` cannot create pull requests

### `.github/workflows/auto-release-self.yml`

Local workflow for this repository. It runs after merged pull requests and from manual dispatch, then delegates release
decisions to `.github/workflows/auto-release.yml`.

### `.github/workflows/auto-release.yml`

Reusable release-decision workflow for `workflow_call` consumers. It gathers release context from the caller repository,
combines the shared release policy in this repository with optional caller policy overrides, asks the configured OpenAI
model whether the merge represents a meaningful release milestone, and can publish a GitHub release when explicitly
enabled.

Typical caller wrapper:

```yaml
jobs:
  auto-release-after-pr:
    if: github.event.pull_request.merged == true
    uses: cyaris/shared-automation/.github/workflows/auto-release.yml@main
    with:
      pr-number: ${{ github.event.pull_request.number }}
      release-sha: ${{ github.event.pull_request.merge_commit_sha }}
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
      CHECKOUT_TOKEN: ${{ secrets.CHECKOUT_TOKEN }}
```

Important inputs:

- `release-sha`, `pr-number`, `policy-path`, and `default-branch`
- `openai-model`, defaulting to `gpt-5-mini`
- `dry-run` for decision reporting without publishing
- `publish` for explicit release publication after a release is selected
- `shared-automation-repository` and `shared-automation-ref` for the shared release policy checkout
- `allowed-dispatch-actor`, defaulting to `cyaris`

Required secret:

- `OPENAI_API_KEY`

Optional secrets:

- `RELEASE_TOKEN` for release and tag creation when broader permissions are needed
- `CHECKOUT_TOKEN` for reading private repositories used by the workflow

### `.github/workflows/ci.yml`

Reusable Node package validation workflow. It checks out the caller repository, optionally checks out and builds
`svelte-lib` and additional local `file:` dependency repositories, installs caller dependencies, then runs configurable
format, lint, framework check, and build commands.

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
      svelte-lib-ref: ${{ vars.SVELTE_LIB_REF || 'main' }}
    secrets:
      CHECKOUT_TOKEN: ${{ secrets.CHECKOUT_TOKEN }}
      RELEASE_TOKEN: ${{ secrets.RELEASE_TOKEN }}
```

Important inputs:

- `working-directory`, `node-version`, and `install-command`
- `format-command`, `lint-command`, `check-command`, and `build-command`; set any command to an empty string to skip it
- `checkout-svelte-lib`, `svelte-lib-repository`, and `svelte-lib-ref`
- optional `local-dependency-repositories` entries as `owner/repo:path:ref`
- `allowed-dispatch-actor`, defaulting to `cyaris`

When `checkout-svelte-lib` or `local-dependency-repositories` are used, those repositories are installed and built before
the caller runs `npm ci`. This keeps local `file:` dependencies usable even when generated `dist/` output is ignored by
Git.

Optional secret:

- `CHECKOUT_TOKEN` for reading private dependency repositories
- `RELEASE_TOKEN` as a checkout fallback when `CHECKOUT_TOKEN` is not configured

### `.github/workflows/rollup-upload.yml`

Reusable embedded bundle workflow. It checks out the caller repository, checks out `svelte-lib` as a local dependency,
checks out this repository for the composite upload action, then builds and uploads configured bundle files to S3.

The composite action implementation lives at `.github/actions/rollup-upload/action.yml`.

Important inputs:

- `working-directory` and `dist-directory`
- `bundle-files` as `path:content-type` lines
- `s3-bucket`, `s3-prefix`, and `aws-region`
- `aws-role-to-assume` for AWS OIDC authentication
- `production`, `dry-run`, `sync-dist-extras`, `cache-control`, and `metadata-refresh-files`
- `shared-automation-repository` and `shared-automation-ref` for the composite action checkout
- `svelte-lib-repository` and `svelte-lib-ref` for the local `svelte-lib` dependency checkout
- optional `local-dependency-repositories` entries as `owner/repo:path:ref`
- `allowed-dispatch-actor`, defaulting to `cyaris`

Optional secrets:

- `CHECKOUT_TOKEN` for reading private dependency repositories
- `RELEASE_TOKEN` as a checkout fallback when `CHECKOUT_TOKEN` is not configured
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` when `aws-role-to-assume` is omitted

Private dependency note: callers that install private repositories such as `cyaris/svelte-lib` through local `file:`
dependencies must pass a checkout-capable `CHECKOUT_TOKEN` or `RELEASE_TOKEN`. Callers that only read the reusable
workflow files from this public repository do not need a token for that read.

## Branch Model

Use `main` for stable reusable workflow definitions and `dev` for proposed changes. Dependent repositories should call
`@main` by default and use a pinned SHA only when they need a stable rollout point.
