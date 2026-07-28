# shared-automation

Shared GitHub Actions workflows and automation used across cyaris repositories.

This repository is the neutral home for reusable workflow implementations that should not live in an application or
library repository. Downstream repositories should keep thin local wrapper workflows that define when the workflow runs,
then call the reusable implementation here with `uses: cyaris/shared-automation/.github/workflows/<workflow>.yml@main`.

Manual `workflow_dispatch` runs are guarded by the reusable workflow implementations. By default, they only allow the
`cyaris` GitHub actor to run manually dispatched workflows; another actor will fail immediately before any checkout or
deployment work happens.

## Workflows

### `.github/workflows/auto-create-dev-pr.yml`

Reusable workflow for opening a pull request from `dev` to the caller repository default branch after changes are pushed
to `dev`, when no such pull request already exists.

### `.github/workflows/auto-release-self.yml`

Local workflow for this repository. It runs after merged pull requests and from manual dispatch, then delegates release
decisions to `.github/workflows/auto-release.yml`.

### `.github/workflows/auto-release.yml`

Reusable release-decision workflow for `workflow_call` consumers. It gathers release context from the caller repository,
combines the shared release policy in this repository with optional caller policy overrides, asks the configured OpenAI
model whether the merge represents a meaningful release milestone, and can publish a GitHub release when explicitly
enabled.

Downstream wrapper example:

```yaml
jobs:
  auto-release-after-pr:
    if: github.event.pull_request.merged == true
    uses: cyaris/shared-automation/.github/workflows/auto-release.yml@main
    with:
      pr-number: ${{ github.event.pull_request.number }}
      release-sha: ${{ github.event.pull_request.merge_commit_sha }}
    secrets: inherit
```

Required secret:

- `OPENAI_API_KEY`

Optional secrets:

- `RELEASE_TOKEN` for release and tag creation when broader permissions are needed
- `CHECKOUT_TOKEN` for reading private repositories used by the workflow

### `.github/workflows/ci.yml`

Reusable Node package validation workflow. It checks out the caller repository, optionally checks out and builds
local `file:` dependency repositories, installs caller dependencies, then runs configurable format, lint, framework
check, and build commands.

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

- `working-directory`, `node-version`, and `install-command`
- `format-command`, `lint-command`, `check-command`, and `build-command`; set any command to an empty string to skip it
- optional `local-dependency-repositories` entries as `owner/repo:path:ref`
- `allowed-dispatch-actor`, defaulting to `cyaris`

When `local-dependency-repositories` is used, those repositories are installed and built before the caller runs `npm ci`.
This keeps local `file:` dependencies usable even when generated `dist/` output is ignored by Git.

Optional secret:

- `CHECKOUT_TOKEN` for reading private dependency repositories
- `RELEASE_TOKEN` as a checkout fallback when `CHECKOUT_TOKEN` is not configured

### `.github/workflows/rollup-upload.yml`

Reusable embedded bundle workflow. It checks out the caller repository, checks out `svelte-lib` as a local dependency,
checks out this repository for the composite upload action, then builds and uploads configured bundle files to S3.

The composite action implementation lives at `.github/actions/rollup-upload/action.yml`.

## Branch Model

Use `main` for stable reusable workflow definitions and `dev` for proposed changes. Dependent repositories should call
`@main` by default and use a pinned SHA only when they need a stable rollout point.
