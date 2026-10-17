# Git And Pull Requests

## Agent And Skill Execution

- Execute a skill's instructions in the active primary agent session, using that session's model and compute. Treat a skill as portable instruction text: its location under Claude, Codex, or another agent does not authorize launching that vendor's CLI, subprocess, remote session, or separate agent runtime. Naming a skill from another agent ecosystem requests the skill's workflow, not that ecosystem's compute. Use separate agent compute only when the user explicitly asks to run that separate agent or model rather than merely naming its skill.

## Commit Integrity

- Assume another session may be editing the same working tree at the same time. A commit must hold exactly the
  changes its session made, and never another session's.
- Stage by path, never with `git add -A`, `git add .`, or `git commit -a`. Before staging a file, read its
  `git diff HEAD -- <path>`, which shows staged hunks as well as unstaged ones: if any hunk is not yours, stage only
  your hunks, or leave the file and tell the user. Before committing, read the full `git diff --cached` on its own,
  hunk by hunk: another session may have staged files you never touched, or hunks in a file you also changed, and a
  plain `git commit` takes all of them. `git diff --cached --stat` summarizes it but lists only files, so it cannot
  show a foreign hunk in your own file. If the staged diff holds anything that is not yours, commit through the
  temporary index described below instead. Never chain staging, this check, and the commit in one command.
- Never stash, reset, restore, or check out a file you did not change, because doing so moves another session's
  uncommitted work.
- Make, commit, and push a change from the working tree the user runs, never from a separate worktree or clone of
  it. A commit pushed from elsewhere leaves the user's checkout behind its own branch, so a running dev server never
  shows the change, and where another session has uncommitted edits to the same files, the next pull cannot apply
  without stashing or merging that work. A scratch worktree may build or test a candidate tree but never commits to
  a branch the user's checkout tracks. When the shared index holds anything another session staged, commit through
  a temporary index built from `HEAD` plus only your hunks, then add the same hunks to the shared index, so neither
  the working tree nor the other session's staging moves.
- Right after committing, compare the full `git show HEAD` with the hunks you meant to commit, and confirm that
  `HEAD`'s parent is the commit you started from, as a separate step before any push, never chained to the commit. If
  your change is missing, landed in another session's commit, or shares your commit with work you did not make, stop
  and tell the user before pushing. Never rewrite a pushed commit to fix this.
- Write clear, specific commit subjects that describe the actual change. Prefer plain language over release-tool syntax,
  and do not exaggerate routine maintenance as user-facing work.
- Never commit, print, or log a secret, or put one in a fixture, URL, client response, analytics event, or pull
  request. Treat public keys, such as a CAPTCHA site key, as configuration, and keep secrets server-side and out of
  browser-readable roles. A provider's official test credentials may appear in local-development fixtures, never in
  production configuration.

## Pull Requests

- Never merge a pull request unless the user explicitly instructs you to merge that specific pull request or an
  unambiguous identified set of pull requests. Requests to fix, finish, deploy, publish, investigate, make checks green,
  or continue do not authorize a merge; neither do green checks, review completion, mergeability, or prior authorization
  for a different pull request. When a pull request is ready without explicit merge authorization, leave it open and
  report its readiness. The instruction must say **merge** and name the pull request by number or URL. A reply such as
  "go for it," "proceed," or "ship it" does not authorize a merge, even right after the assistant proposes merging a
  specific pull request, and permission to commit or push is not permission to merge. Ask for that instruction when a
  deployment needs a merge.
- Before merging any pull request, explicitly inspect CodeRabbit comments and reviews and assess every still-applicable
  finding; do not merge solely because checks are green.
- When a pull request depends on configuration or approval that cannot be committed to the repository, put a prominent
  caution in the pull-request description before its merge or deployment instructions. This includes repository,
  organization, or environment variables and secrets; API credentials and tokens; cloud projects, billing, identities,
  permissions, services, and resources; OAuth applications, origins, and callback URLs; DNS and provider-dashboard
  settings; third-party approval; paid-plan requirements; production migrations; and other manual external state.
- Make the caution an actionable inventory. Name every required item exactly, identify where it must be configured,
  distinguish public configuration from secrets, state prerequisites and required ordering, explain how to verify the
  resulting contract without revealing secret values, and state what remains unavailable or fails while an item is
  missing. Never put a credential, token, private key, or other secret value in the pull request.
- Separate completed external setup from pending work and include verification evidence for completed items. Keep an
  activation-dependent pull request explicitly blocked while required external setup or verification remains pending,
  and update the caution as each item is completed so later maintainers do not repeat a destructive step or assume that
  committed workflow or migration files changed the external system.

## Release Management

- Use the default policy in `.github/release-policy.yml` unless a caller has a durable project-specific override in its
  own `.github/release-policy.yml`, which never reintroduces shared release implementation logic. Keep version and
  title formats in policy files rather than duplicating them in `AGENTS.md`.
- Evaluate whether accumulated changes form a meaningful release milestone. Substantial user-facing features,
  architecture changes, important reliability, security, accessibility, performance, or compatibility improvements,
  and coherent groups of material changes may warrant a release. Routine maintenance, formatting, minor refactors,
  isolated dependency updates, and small fixes normally do not.
- When a release may be warranted, explain the milestone, suggest a policy-consistent title and tag, summarize release
  notes and migration concerns, and recommend full release, prerelease, or draft status.
- Treat work on PR or development branches as a release candidate. The final tag should normally point to the merge
  commit on `main` or `master` unless the user explicitly approves another branch.
- Do not create, rename, move, or delete tags or publish a GitHub release unless the user explicitly requests it.
- Treat upstream automation, shared workflow reference, dependency-pin, Renovate, and release-policy maintenance as
  non-release work unless it changes repository user behavior or a published package/runtime API.
