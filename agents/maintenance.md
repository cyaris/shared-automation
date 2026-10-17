# Shared Automation Maintenance

## Workflow Implementation

- Keep reusable workflow implementations in `.github/workflows`.
- Keep composite GitHub Actions in `.github/actions`.
- Keep reusable workflow and composite-action contracts on structured inputs such as booleans, paths, refs, file lists,
  and validated spec lines. Do not expose arbitrary shell command strings as caller inputs unless a documented caller
  need cannot be expressed through fixed package scripts or structured configuration; keep shared CI validation on fixed
  npm scripts controlled by boolean inputs.
- Keep `.github/workflows/workflow-validation.yml` aligned with workflow and composite-action changes so `actionlint` and
  `zizmor` run when automation files change.

## Workflow Documentation

- Document every workflow and composite action in `README.md` when adding, renaming, or changing it in a way that affects callers.
- Document each reusable workflow's trigger model, purpose, caller-facing inputs, required secrets, optional secrets, dispatch behavior, and caller expectations.
- Document whether a workflow can be dispatched from the GitHub Actions UI and how it is dispatched when UI dispatch is not available.

## Renovate Preset

- Configure Renovate to manage npm dependencies, GitHub Actions, reusable workflow references, lockfile maintenance,
  Node versions declared in workflow inputs, and any future Docker files that Renovate can detect natively.
- Do not enable Renovate automerge by default. Dependency updates should remain reviewable pull requests unless a
  repository has an explicit low-risk automerge policy.
- Keep generated, vendored, and build-output paths out of Renovate scans, including `node_modules`, `_site`,
  `.svelte-kit`, `dist`, and `build`.
- Document Renovate GitHub App installation and access requirements before claiming dependency automation is active for
  a repository.
