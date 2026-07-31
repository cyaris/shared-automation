# Release Please Preparation

Release Please should manage future releases after the historical handoff in
`docs/historical-release-handoff.md`. It must not backfill historical milestones or publish releases for commits already
covered by that handoff.

## Recommendation

Use small repository-local workflows that call the official `googleapis/release-please-action@v4` action directly,
instead of adding another reusable workflow layer in this repository.

Reasons:

- Release Please already provides the reusable implementation.
- Repository-local workflows make the trigger branch, permissions, and manifest files visible where releases happen.
- A shared wrapper would mostly pass through official action inputs while adding another versioned contract to maintain.
- Repository-local config files are still the source of truth for release type, bootstrap SHA, package path, and current
  version.

This is a narrow exception to the normal shared-automation rule. The custom historical release workflow, dev PR workflow,
CI workflow, and rollup upload workflow remain shared because they contain portfolio-specific behavior.

## Candidate Strategy

| Repository | Recommendation | Release type | Current version seed | Bootstrap SHA |
| --- | --- | --- | --- | --- |
| `charlieyaris-workers` | Prepare later | `simple` if formal future releases resume | `1.0.0` | `1a61c926d9e2a08009bec1c7b5182be7fbd3450c` |
| `cyaris.github.io` | Prepare | `simple` | `6.2.0` | `86c46fbb3b8e26aa9e05f204b1fb9d6c655226bd` |
| `fireworks` | Prepare | `simple` | `1.1.0` | `1724b81115826d65edaa9c8012849607aece2f78` |
| `mastermind` | Prepare | `simple` | `3.3.0` | `2504eb35e885174bb12fde5ac3cf3ceb82ea595d` |
| `profile_photo` | Prepare | `simple` | `1.1.0` | `8477c3d454451d2980cac141213d0c1930341e05` |
| `shared-automation` | Prepare | `simple` | `1.1.0` | `96e8cee8ba4122957d9ec5fd4b50d34df35cfce2` |
| `svelte-lib` | Prepare with care | `node` or `simple` | `1.3.0` | `dd21081e3a8516fdb0cfeb4ed3abfcef978e87b4` |
| `the_networks_of_war` | Prepare | `simple` | `2.2.0` | `40b4eab2ed2f58fb496b5a8552cdf417339e8a4d` |
| `us_gun_violence_forecasting` | Prepare | `simple` | `2.3.0` | `cec3a25c88564179f80d4b85fdd10057bc9346dd` |

Use `simple` for application, website, infrastructure, and private tool repositories unless a repository explicitly
wants Release Please to update `package.json` or another package-manager version file.

Use `node` for `svelte-lib` only if the package version should move from `0.0.4` to the public release series on the
first Release Please PR. If that version jump is not desired, use `simple` and leave `package.json` versioning separate.

## Local Workflow Template

```yaml
name: Release Please

on:
  push:
    branches:
      - main

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

For `master` repositories, set the trigger branch to `master`.

## Config Template

```json
{
  "bootstrap-sha": "<handoff-sha>",
  "include-component-in-tag": false,
  "packages": {
    ".": {
      "release-type": "simple"
    }
  }
}
```

## Manifest Template

```json
{
  ".": "<current-version>"
}
```

The manifest version should use SemVer format. For historical tags such as `v1`, seed `1.0.0`. For tags such as `v2.2`
or `v1.3`, seed `2.2.0` or `1.3.0`.

Future Release Please tags should use full SemVer tags such as `v1.2.0`. That is a deliberate normalization from some
historical app tags that omitted patch versions, such as `v1.1` or `v2.2`.

## Enablement Checklist

1. Confirm no new default-branch commits landed after the handoff SHA.
2. Add `release-please-config.json`, `.release-please-manifest.json`, and `.github/workflows/release-please.yml`.
3. Set `bootstrap-sha` to the repository's handoff SHA.
4. Seed the manifest with the newest reconciled release version.
5. Merge the Release Please setup PR.
6. Confirm the first Release Please run opens no release PR unless there are new conventional commits after the
   handoff.
7. Remove `bootstrap-sha` after the first successful Release Please release PR is merged, if Release Please no longer
   needs it.

Do not update callers from `cyaris/shared-automation/...@main` to `@v1` until the shared workflow versioning model is
separately approved and the `v1` tag strategy exists.
