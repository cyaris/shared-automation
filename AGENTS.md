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
- Document each reusable workflow's trigger model, purpose, caller-facing inputs, required secrets, optional secrets, dispatch behavior, and caller expectations.
- Document whether a workflow can be dispatched from the GitHub Actions UI and how it is dispatched when UI dispatch is not available.
- Keep private action and dependency access requirements documented in `README.md`. Caller repositories that check out private local dependencies need a checkout-capable `CHECKOUT_TOKEN` or `RELEASE_TOKEN`; callers that only read this public repository's reusable workflow files should not need a token for that read.

## Caller Workflow Expectations

- Caller repositories should keep root `CI`, `Rollup upload`, `Auto-create dev pull request`, and `Auto release` workflows as thin callers of this repository's reusable workflows whenever those shared workflows cover the needed behavior.
- For rollup upload callers, preserve automatic production uploads on pushes to `main` or `master`; manual dispatch should keep staged uploads as the default unless `production` is explicitly selected.
