# Repository Instructions

## Scope And Inheritance

- Repositories that call workflows or actions from `cyaris/shared-automation` may use this `AGENTS.md` as the source of truth for shared GitHub Actions, reusable workflow wrapper, release-policy, dispatch, and automation documentation conventions.
- Treat these shared rules as scoped to automation behavior. Project-specific build commands, dependency refs, bundle files, S3 prefixes, release naming, milestone wording, deployment targets, and documentation style rules belong in the caller repository's own `AGENTS.md` or `.github/release-policy.yml`.
- When a caller repository inherits these rules, keep a local `AGENTS.md` note that points back to `../shared-automation/AGENTS.md`, then list only the caller-specific automation details that differ from the shared defaults.

## Shared Workflow Implementations

- Keep reusable workflow implementations in `.github/workflows`.
- Keep composite GitHub Actions in `.github/actions`.
- Keep shared CI, rollup upload, auto-create-dev-PR, and auto-release implementation changes in this repository. Caller repositories should keep thin local wrapper workflows that define triggers, permissions, inputs, secrets, and repository-specific values before calling the reusable workflow here.
- Keep reusable workflow defaults general. Caller-specific commands, local dependency refs, bundle file lists, metadata refresh files, branch selections, S3 prefixes, and release naming or milestone overrides belong in caller workflow inputs or caller release-policy files.
- Keep the default release policy in this repository. Caller repositories should add `.github/release-policy.yml` only for project-specific overrides, not to reintroduce shared release implementation logic.
- Do not move a repository-specific workflow implementation into this repository unless another repository will share the same behavior.
- Manual `workflow_dispatch` paths must remain restricted to the `cyaris` GitHub actor by default.

## Documentation

- Document every workflow and composite action in `README.md` when adding, renaming, or changing it in a way that affects callers.
- Keep README and AGENTS guidance focused on current behavior, active requirements, and durable project decisions. Remove
  migration-era notes, deprecated-option explanations, old fallback paths, and historical caveats once they no longer
  affect how someone uses, maintains, deploys, or releases the project. When a state change makes a requirement obsolete,
  update the affected docs and configuration in that same change.
- Document each reusable workflow's trigger model, purpose, caller-facing inputs, required secrets, optional secrets, dispatch behavior, and caller expectations.
- Document whether a workflow can be dispatched from the GitHub Actions UI and how it is dispatched when UI dispatch is not available.
- Keep private action and dependency access requirements documented in `README.md`.
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
- Keep shared CI validation on fixed npm scripts controlled by boolean inputs. Add command-string escape hatches only
  when a caller has a documented need that cannot be expressed through package scripts.
- For rollup-upload caller README sections, describe the local upload trigger, S3 destination, bundle files, production
  or staged naming, and repository-specific dependency refs, then link to the shared workflow description for upload
  behavior, inputs, and secrets.

## Caller Workflow Expectations

- Caller repositories should keep root `CI`, `Rollup upload`, `Auto-create dev pull request`, and `Auto release` workflows as thin callers of this repository's reusable workflows whenever those shared workflows cover the needed behavior.
- Workflows must fail clearly when a requested feature requires credentials, secrets, repository variables, external
  permissions, or paid services that are not configured. Apply this to dry-run modes too: a dry run may avoid external
  writes, but it should still prove that required credentials exist unless the feature is explicitly documented as
  credential-optional.
- For rollup upload callers, pushes to `main` or `master` should run production uploads. Manual dispatch should keep
  staged uploads as the default unless `production` is explicitly selected.

## Workflow Validation And Security

- Keep `.github/workflows/workflow-validation.yml` aligned with workflow and composite-action changes so `actionlint` and
  `zizmor` run when automation files change.
- Treat `actionlint` failures as workflow contract or syntax issues to fix before rollout.
- Treat `zizmor` findings as security-review prompts. Fix true positives, document accepted risks, and avoid broad
  suppressions.
