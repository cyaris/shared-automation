# Historical Release Handoff

Historical release reconciliation was completed on 2026-07-30 America/Chicago by manually running each eligible
repository's `auto-release` workflow with `publish=true` after report-only review. Publish run timestamps are recorded
by GitHub Actions in UTC.

The historical `auto-release` workflow remains available for manually approved repair or backfill runs, but it should
not publish releases for commits after the handoff boundary once future release tooling takes ownership.

## Handoff Boundaries

| Repository | Default branch | Final commit covered | Newest reconciled release | Existing releases updated | First future commit |
| --- | --- | --- | --- | --- | --- |
| `charlieyaris-workers` | `main` | `1a61c926d9e2a08009bec1c7b5182be7fbd3450c` | `v1` | No | The next commit after `1a61c926d9e2a08009bec1c7b5182be7fbd3450c` |
| `cyaris.github.io` | `master` | `86c46fbb3b8e26aa9e05f204b1fb9d6c655226bd` | `v6.2.0` | No | The next commit after `86c46fbb3b8e26aa9e05f204b1fb9d6c655226bd` |
| `fireworks` | `main` | `1724b81115826d65edaa9c8012849607aece2f78` | `v1.1` | No | The next commit after `1724b81115826d65edaa9c8012849607aece2f78` |
| `mastermind` | `master` | `2504eb35e885174bb12fde5ac3cf3ceb82ea595d` | `v3.3` | `v3.2` notes | The next commit after `2504eb35e885174bb12fde5ac3cf3ceb82ea595d` |
| `profile_photo` | `main` | `8477c3d454451d2980cac141213d0c1930341e05` | `v1.1` | No | The next commit after `8477c3d454451d2980cac141213d0c1930341e05` |
| `shared-automation` | `main` | `96e8cee8ba4122957d9ec5fd4b50d34df35cfce2` | `v1.1.0` | No | The next commit after `96e8cee8ba4122957d9ec5fd4b50d34df35cfce2` |
| `svelte-lib` | `main` | `dd21081e3a8516fdb0cfeb4ed3abfcef978e87b4` | `v1.3` | No | The next commit after `dd21081e3a8516fdb0cfeb4ed3abfcef978e87b4` |
| `the_networks_of_war` | `master` | `40b4eab2ed2f58fb496b5a8552cdf417339e8a4d` | `v2.2` | No | The next commit after `40b4eab2ed2f58fb496b5a8552cdf417339e8a4d` |
| `us_gun_violence_forecasting` | `master` | `cec3a25c88564179f80d4b85fdd10057bc9346dd` | `v2.3` | No | The next commit after `cec3a25c88564179f80d4b85fdd10057bc9346dd` |

## Publication Runs

| Repository | Publish run | Applied result |
| --- | --- | --- |
| `charlieyaris-workers` | `30598067930` | Skipped new release creation; existing `v1` remains the newest release |
| `cyaris.github.io` | `30598067846` | Created `v6.2.0` |
| `fireworks` | `30598067890` | Created `v1.1` |
| `mastermind` | `30598067875` | Created `v3.3` and updated `v3.2` notes |
| `profile_photo` | `30598067853` | Created `v1.1` |
| `shared-automation` | `30598067748` | Created `v1.1.0` |
| `svelte-lib` | `30598068004` | Created `v1.3` |
| `the_networks_of_war` | `30598067847` | Created `v2.2` |
| `us_gun_violence_forecasting` | `30598068086` | Created `v2.3` |

## Verification

Live GitHub state was checked after publication. No repository had a merged pull request after its publish run's target
commit. `svelte-lib` was rechecked separately: `main` and tag `v1.3` both point to
`dd21081e3a8516fdb0cfeb4ed3abfcef978e87b4`.

`charlieyaris-workers` is intentionally different from the other repositories: the workflow reviewed history through
`1a61c926d9e2a08009bec1c7b5182be7fbd3450c` and decided no new release was warranted. Future release tooling must use
that commit as the bootstrap boundary even though the newest release remains `v1`.

## Future Rules

- Historical `auto-release` runs remain manual and default to report-only.
- Historical repair runs must specify the target SHA or range being repaired and must not overlap the completed handoff
  range unless the repaired action is explicitly approved.
- Release Please, when enabled, should manage only commits after the `First future commit` boundary in this file.
- If a repository's default branch moves before Release Please is enabled, update its bootstrap boundary before enabling
  Release Please.
