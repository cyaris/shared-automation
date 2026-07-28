# Repository Instructions

- Keep reusable workflow implementations in `.github/workflows`.
- Keep composite GitHub Actions in `.github/actions`.
- Document every workflow in `README.md` when adding, renaming, or changing it in a way that affects callers.
- Document caller-facing inputs, required secrets, optional secrets, and dispatch behavior for each reusable workflow.
- Manual `workflow_dispatch` paths must remain restricted to the `cyaris` GitHub actor by default.
