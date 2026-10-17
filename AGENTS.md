# Repository Instructions

Shared automation, documentation, and collaboration conventions live in topic files under `agents/`, so each caller
loads only the topics that apply to it. Read every topic before working in this repository. `CLAUDE.md` imports them
all except `python-sql.md`, which applies here only when a change touches those rules.

Topic | Covers | Applies to
--- | --- | ---
[`agents/documentation.md`](agents/documentation.md) | README and Markdown style, link verification, and compact tables | Every caller
[`agents/git-and-pull-requests.md`](agents/git-and-pull-requests.md) | Agent and skill execution, commit integrity, merges, external-configuration handoffs, and releases | Every caller
[`agents/maintenance.md`](agents/maintenance.md) | Reusable workflow implementation, documentation, and the Renovate preset | This repository only
[`agents/python-sql.md`](agents/python-sql.md) | Python and SQL formatting and style | Callers that opt in
[`agents/workflows.md`](agents/workflows.md) | Caller workflows, refs, dispatch, failures, Rollup, Renovate wrappers, and workflow validation | Every caller

## Scope And Inheritance

- A repository that calls workflows or actions from `cyaris/shared-automation` imports `documentation.md`,
  `git-and-pull-requests.md`, and `workflows.md` from its `CLAUDE.md`, and `python-sql.md` only where it opts into the
  shared language conventions, from the `CLAUDE.md` nearest its Python or SQL. It names the same files in its
  `AGENTS.md` for agents that do not follow imports, then lists only caller-specific details that differ from the
  shared defaults.
- Project-specific build commands, dependency refs, bundle files, S3 prefixes, release naming, milestone wording,
  deployment targets, and project-specific documentation content belong in the caller repository's own `AGENTS.md` or
  `.github/release-policy.yml`.
