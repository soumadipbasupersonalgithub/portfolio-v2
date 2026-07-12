# Jenkins setup — free, local, step by step

This document takes you from nothing to a working PR quality gate using a
self-hosted, open-source Jenkins on your own machine. Estimated time: ~45 min.

The pipeline itself lives in the [`Jenkinsfile`](../Jenkinsfile) at the repo
root; Jenkins only needs to be pointed at the repository.

---

## 1. Install Jenkins (Windows)

1. Install a Java 17 or 21 JDK (e.g. [Adoptium Temurin](https://adoptium.net/)).
2. Download the **Jenkins LTS Windows installer** from <https://www.jenkins.io/download/> and run it. Install as a service on the default port **8080**.
3. Open <http://localhost:8080>, unlock with the initial admin password
   (`C:\ProgramData\Jenkins\.jenkins\secrets\initialAdminPassword`), choose
   **Install suggested plugins**, and create your admin user.

### Docker Desktop (needed for the Playwright agent)

The `Jenkinsfile` runs everything inside the official Playwright Docker image
(`mcr.microsoft.com/playwright:v1.61.1-noble`) so browsers and their system
dependencies are preinstalled and CI rendering is deterministic.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) with the **WSL 2** backend, and keep it in **Linux containers** mode (the default).
2. Make sure the account running the Jenkins service can reach Docker: run `docker version` in a terminal; if Jenkins runs as `LocalSystem` and can't find Docker, the simplest fix is to run Jenkins as your own user (Services → Jenkins → Log On).

> **Running without Docker** — automatic. The pipeline detects at runtime
> whether Linux-Docker is available: if yes, everything runs inside the
> Playwright image (preferred — deterministic rendering, `linux` visual
> baselines); if not (e.g. Jenkins on this Windows machine), the gate runs
> directly on the host — Playwright browsers are installed once and cached,
> and that platform's committed baselines (e.g. `win32`) gate the build.
> Host mode needs Node.js 22+ and, on Windows, Git Bash on the Jenkins PATH
> (the provided `start-jenkins.bat` handles this).
> Note: `agent { docker }` can never work from a Windows controller — the
> plugin mounts Windows workspace paths into Linux containers — which is why
> the detection requires a *Linux* node, not just a working `docker` CLI.

## 2. Install required plugins

**Manage Jenkins → Plugins → Available**, install (restart after):

| Plugin | Why |
|---|---|
| **GitHub** | Webhook handling, GitHub API integration |
| **GitHub Branch Source** | Discovers branches & PRs, builds PRs automatically |
| **Pipeline** (workflow-aggregator) | Declarative `Jenkinsfile` support (usually already installed) |
| **Docker Pipeline** | Lets the pipeline use a Docker image as its agent |
| **Credentials Binding** | `withCredentials` for the GitHub token |
| **HTML Publisher** | Publishes the Playwright & Lighthouse HTML reports |
| **JUnit** | Test result trend from Playwright's JUnit output (usually already installed) |

## 3. Create the GitHub token and Jenkins credentials

### 3.1 GitHub Personal Access Token (PAT)

GitHub → **Settings → Developer settings → Personal access tokens**:

- **Classic token**: scope **`repo`** (includes `repo:status` for commit
  statuses and PR write for the auto-close feature).
- **Fine-grained token** (alternative): repository `portfolio-v2`, permissions
  **Commit statuses: Read & write**, **Pull requests: Read & write**,
  **Contents: Read-only**, **Metadata: Read-only**.

Copy the token — you'll paste it twice below. **Never commit it anywhere.**

### 3.2 Jenkins credentials

**Manage Jenkins → Credentials → System → Global credentials → Add Credentials**, create **two** entries from the same PAT:

1. Kind **Secret text** — ID **`github-pat`** (exactly; the `Jenkinsfile`
   references this ID) — Secret: the PAT. Used by the pipeline to post commit
   statuses and close PRs.
2. Kind **Username with password** — ID `github-user-pat` — Username: your
   GitHub username, Password: the PAT. Used by the GitHub Branch Source to
   scan the repo without hitting anonymous API rate limits.

## 4. Create the Multibranch Pipeline job

1. **Dashboard → New Item** → name `portfolio-v2-quality-gate` → **Multibranch Pipeline** → OK.
2. **Branch Sources → Add source → GitHub**:
   - Credentials: `github-user-pat`
   - Repository HTTPS URL: `https://github.com/soumadipbasupersonalgithub/portfolio-v2.git`
3. **Behaviours** (add/keep these):
   - *Discover branches* → **Exclude branches that are also filed as PRs**
   - *Discover pull requests from origin* → **The current pull request revision**
     (build the PR head — commit statuses land on the commit shown in the PR;
     the `Jenkinsfile` also handles the "merge" strategy if you prefer it)
   - *Discover pull requests from forks* → Trust: **From users with Admin or Write permission** (never build untrusted `Jenkinsfile`s from strangers' forks)
4. **Build Configuration**: by `Jenkinsfile`, path `Jenkinsfile` (default).
5. Save. Jenkins scans the repo and builds existing branches/PRs once.

### The auto-close toggle

Auto-closing failed PRs is **off by default** — merging is already blocked by
branch protection (see [BRANCH_PROTECTION.md](BRANCH_PROTECTION.md)). To turn
it on: **Manage Jenkins → System → Global properties → Environment
variables** → add `AUTO_CLOSE_ON_FAILURE` = `true`. Set it back to `false`
(or delete it) to disable. When enabled, a failed PR build posts an
explanatory comment (with a link to the Jenkins build and reopen
instructions) and then closes the PR.

## 5. Triggering builds from GitHub

GitHub must be able to *reach* your Jenkins to push webhook events. A Jenkins
on `localhost` isn't reachable from the internet, so pick one of these:

### Option A — ngrok tunnel (default; instant feedback)

1. Sign up free at <https://ngrok.com>, install, run `ngrok config add-authtoken <token>`.
2. Claim your **free static domain** (ngrok dashboard → Domains) so the URL
   survives restarts, then start the tunnel:

   ```bash
   ngrok http --url=<your-static-domain>.ngrok-free.app 8080
   ```

   (Without a static domain, `ngrok http 8080` works but the URL changes on
   every restart and you must update the webhook each time.)
3. GitHub repo → **Settings → Webhooks → Add webhook**:
   - Payload URL: `https://<your-static-domain>.ngrok-free.app/github-webhook/` (trailing slash matters)
   - Content type: `application/json`
   - Events: **Let me select** → `Pushes` + `Pull requests`
4. Test: open a PR — the webhook fires, Jenkins builds within seconds.
   GitHub's webhook page shows delivery status (green ✓) under *Recent Deliveries*.

Keep the ngrok process running while you want webhooks to work. If it's down,
nothing breaks — you just fall back to polling/manual scans.

### Option B — polling fallback (no tunnel, no extra software)

Jenkins asks GitHub for changes on a schedule instead of being pushed to:

1. Multibranch job → **Configure → Scan Repository Triggers** →
   ✔ *Periodically if not otherwise run* → Interval: **5 minutes**.
2. That's it. New PRs and new commits are picked up on the next scan
   (worst-case latency = the interval). You can also click **Scan Repository
   Now** any time to trigger immediately.

Both options can coexist: webhooks give instant builds when ngrok is up,
the periodic scan catches anything missed.

## 6. Verify the pipeline end to end

1. Create a branch, change something visible (e.g. a heading), push, open a PR against `main`.
2. Watch the job: Checkout → Install → Build & Serve → Playwright functional
   → Playwright visual → Lighthouse CI.
3. On the PR page you should see the **`ci/jenkins/quality-gate`** status
   check (pending → success/failure), plus Jenkins' own
   `continuous-integration/jenkins/pr-head` check from the Branch Source plugin.
4. In Jenkins, the build page links the **Playwright Report** and
   **Lighthouse Report** (HTML Publisher) and archives them as artifacts.
5. First ever run: the visual stage auto-creates baselines and marks the
   build **UNSTABLE** with instructions — download
   `tests/visual/__screenshots__/**` from the artifacts, commit them, and the
   next run compares against them. See the README's *Visual baselines* section.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: not found` in the build log | Docker Desktop not running, or the Jenkins service account can't see it — run Jenkins as your user (§1) |
| Webhook shows red ✗ in GitHub | ngrok not running / URL changed — restart tunnel, update the webhook payload URL |
| Status check never appears on the PR | First build must complete once; also confirm the `github-pat` credential ID matches exactly |
| `EACCES`/permission errors in workspace | The pipeline runs as root in the container (`-u root:root` arg) — check the arg wasn't removed |
| Lighthouse "Chrome not found" | The pipeline exports `CHROME_PATH` from Playwright's Chromium — check the Install stage ran `npm ci` successfully |
| `npm run lhci` crashes locally on **Windows** with `EPERM … Temp\lighthouse.*` | Known chrome-launcher issue: the audit completes but temp-profile cleanup races with antivirus file locks. The pipeline's host mode works around it (runs `lighthouse` directly + `scripts/assert-lighthouse.cjs`); `lhci autorun` itself is only used in container mode (Linux) |
| Visual tests fail after a dependency/browser update | Rendering changed with the browser — regenerate baselines (README §Visual baselines) and review the diff |
