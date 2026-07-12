# Branch protection — making the Jenkins check required

Branch protection is the *real* merge gate: even with the auto-close toggle
off (its default), a PR whose Jenkins check fails **cannot be merged**.

## Setup (classic branch protection rule)

1. GitHub repo → **Settings → Branches → Add branch protection rule**.
2. Branch name pattern: `main`.
3. Enable:
   - ✔ **Require a pull request before merging** (this is what forces changes
     through the pipeline at all)
   - ✔ **Require status checks to pass before merging**
     - In the search box, add **`ci/jenkins/quality-gate`** — this is the
       status context the `Jenkinsfile` posts. It only appears in the list
       after the pipeline has reported at least once, so run one PR build
       first (or type the name manually).
     - Optionally also add `continuous-integration/jenkins/pr-head`, the
       check posted automatically by the GitHub Branch Source plugin.
   - ✔ **Require branches to be up to date before merging** *(recommended)* —
     re-runs the gate after `main` moves, so you never merge a stale-tested PR.
   - ✔ **Do not allow bypassing the above settings** *(recommended)* — applies
     the rules to admins (you) too. Leave off if you want an escape hatch.
4. Save.

> **Rulesets** (the newer GitHub mechanism) work too: Settings → Rules →
> Rulesets → New branch ruleset → target `main` → add the *Require status
> checks to pass* rule with the same context name.

## What this gives you

- PR opened → Jenkins builds → posts `ci/jenkins/quality-gate` on the PR's
  head commit.
- **Pending or failing** → the merge button is disabled.
- **Passing** → merge is allowed.
- Pushing new commits to the PR re-runs the pipeline and resets the status.

## Interaction with the auto-close toggle

| `AUTO_CLOSE_ON_FAILURE` | On failure |
|---|---|
| `false` (default) | PR stays open, merge blocked. Contributor fixes and pushes; the check re-runs. **Standard practice.** |
| `true` | Same as above, **plus** Jenkins comments an explanation and closes the PR. The branch and discussion are preserved; reopening (button or `gh pr reopen <n>`) re-enters the normal flow. |

Note: closing a PR does not delete anything — but it *does* interrupt
reviewer workflows and hides the PR from the default open list, which is why
the toggle defaults to off and branch protection carries the enforcement.
