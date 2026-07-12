/*
 * Quality gate for portfolio-v2 pull requests.
 *
 * Flow: Checkout → Install → Build → Playwright functional → Playwright
 * visual → Lighthouse → publish reports → GitHub commit status →
 * (optional) auto-close PR on failure.
 *
 * Dual-mode agent — decided at runtime:
 *  - Linux node with Docker: everything runs inside the official Playwright
 *    image (browsers preinstalled, deterministic rendering, `linux` visual
 *    baselines). Preferred for a dedicated CI box.
 *  - Anything else (e.g. a Windows machine running Jenkins directly): the
 *    gate runs on the node itself; Playwright browsers are installed once
 *    and cached, and visual baselines for that platform (e.g. `win32`) gate
 *    the build. `sh` steps require Git Bash on the Jenkins PATH (Windows).
 *    Note: `agent { docker }` cannot work from a Windows controller — the
 *    plugin mounts Windows workspace paths into Linux containers.
 *
 * Requirements (see docs/JENKINS_SETUP.md):
 *  - A "Secret text" credential with ID `github-pat` holding a GitHub token
 *    (classic PAT `repo` scope; fine-grained: Statuses RW + Pull requests RW).
 *  - Plugins: GitHub, GitHub Branch Source, Pipeline, Docker Pipeline,
 *    Credentials Binding, HTML Publisher, JUnit, Workspace Cleanup.
 *
 * Toggle: set env var AUTO_CLOSE_ON_FAILURE=true (Manage Jenkins → System →
 * Global properties → Environment variables, or per-job) to close PRs whose
 * checks fail. Default false — branch protection is the real merge gate.
 */

// Post a commit status on the PR head commit. Secrets are expanded by the
// shell (single-quoted Groovy string), never interpolated into the command.
def githubStatus(String state, String description) {
  if (!env.REPO_SLUG?.trim() || !env.COMMIT_SHA?.trim()) {
    echo "Skipping GitHub status '${state}' — repo slug or commit SHA unknown"
    return
  }
  withCredentials([string(credentialsId: 'github-pat', variable: 'GITHUB_TOKEN')]) {
    withEnv(["GH_STATE=${state}", "GH_DESC=${description}"]) {
      // Best-effort: a GitHub API hiccup must never fail the build itself.
      sh label: "GitHub status: ${state}", script: '''
        curl -sf -o /dev/null -X POST \
          -H "Accept: application/vnd.github+json" \
          -H "Authorization: Bearer $GITHUB_TOKEN" \
          "$GITHUB_API/repos/$REPO_SLUG/statuses/$COMMIT_SHA" \
          -d "{\\"state\\":\\"$GH_STATE\\",\\"context\\":\\"$STATUS_CONTEXT\\",\\"description\\":\\"$GH_DESC\\",\\"target_url\\":\\"$BUILD_URL\\"}" \
          || echo "WARNING: could not post GitHub commit status ($GH_STATE)"
      '''
    }
  }
}

// Close the PR with an explanatory comment. Only runs when the
// AUTO_CLOSE_ON_FAILURE toggle is 'true' AND this is a PR build.
def autoClosePrIfEnabled() {
  if ((env.AUTO_CLOSE_ON_FAILURE ?: 'false').toLowerCase() != 'true') {
    echo 'AUTO_CLOSE_ON_FAILURE is not true — leaving the PR open (merge is still blocked by the required status check).'
    return
  }
  if (!env.CHANGE_ID?.trim()) {
    echo 'Not a PR build — nothing to close.'
    return
  }
  def comment = '### ❌ Quality gate failed — PR closed automatically\\n\\n' +
    "The Jenkins pipeline for this PR failed. Build details: ${env.BUILD_URL}\\n\\n" +
    '**What failed:** check the *Playwright report* and *Lighthouse report* build artifacts.\\n\\n' +
    '**How to reopen:** fix the issue on your branch, then click **Reopen pull request** ' +
    '(or run `gh pr reopen ' + env.CHANGE_ID + '`) and push — the pipeline will run again.\\n\\n' +
    '_Auto-close is controlled by the `AUTO_CLOSE_ON_FAILURE` toggle in Jenkins._'
  writeFile file: '.pr-close-comment.json', text: "{\"body\":\"${comment}\"}"

  withCredentials([string(credentialsId: 'github-pat', variable: 'GITHUB_TOKEN')]) {
    sh label: 'Comment on and close PR', script: '''
      curl -sf -o /dev/null -X POST \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        "$GITHUB_API/repos/$REPO_SLUG/issues/$CHANGE_ID/comments" \
        -d @.pr-close-comment.json
      curl -sf -o /dev/null -X PATCH \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        "$GITHUB_API/repos/$REPO_SLUG/pulls/$CHANGE_ID" \
        -d '{"state":"closed"}'
    '''
  }
  echo "PR #${env.CHANGE_ID} closed (AUTO_CLOSE_ON_FAILURE=true)."
}

// The gate itself — identical steps in container and host mode.
def runQualityGate(boolean inContainer) {
  stage('Install') {
    sh 'node --version && npm --version'
    sh 'npm ci'
    if (!inContainer) {
      // Host mode: the Playwright image isn't in play, so make sure the
      // browsers exist (no-op after the first build — they're cached).
      sh 'npx playwright install chromium webkit'
    }
  }

  stage('Build') {
    // No .env in CI: the site builds with empty API keys, which is fine —
    // tests mock external APIs instead of calling them.
    sh 'npm run build'
  }

  stage('Playwright — functional') {
    sh 'npx playwright test tests/functional'
  }

  stage('Playwright — visual regression') {
    // Baselines are per platform; only the current platform's gate this run.
    def platform = inContainer
      ? 'linux'
      : sh(script: 'node -p "process.platform"', returnStdout: true).trim()
    def hasBaselines = sh(
      script: "ls tests/visual/__screenshots__/*/${platform}/*.png >/dev/null 2>&1",
      returnStatus: true
    ) == 0
    if (hasBaselines) {
      // Strict: any pixel diff beyond the tolerance fails the build.
      sh 'npx playwright test tests/visual'
    } else {
      // First run on this platform: Playwright writes the missing baselines
      // but reports the tests as failed ("snapshot doesn't exist"). Tolerate
      // that once — mark UNSTABLE and hand the baselines over as artifacts.
      catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
        sh 'npx playwright test tests/visual'
      }
      archiveArtifacts artifacts: 'tests/visual/__screenshots__/**', allowEmptyArchive: true
      unstable("No ${platform} visual baselines existed — they were auto-created. Download tests/visual/__screenshots__/** from this build's artifacts and commit them.")
    }
  }

  stage('Lighthouse') {
    if (inContainer) {
      // Reuse Playwright's Chromium; LHCI manages the preview server itself.
      sh label: 'lhci autorun', script: '''
        export CHROME_PATH="$(node -e "console.log(require('playwright-core').chromium.executablePath())")"
        npx lhci autorun --config=lighthouserc.cjs
      '''
    } else {
      // Windows host: chrome-launcher crashes cleaning its temp profile
      // AFTER the audit completes and the report is written (EPERM, known
      // upstream bug). Run lighthouse directly, tolerate the exit code, and
      // assert the written scores against the same thresholds.
      sh label: 'lighthouse ×3 + assert', script: '''
        export CHROME_PATH="$(node -e "console.log(require('playwright-core').chromium.executablePath())")"
        node node_modules/vite/bin/vite.js preview --port 4173 --strictPort > preview.log 2>&1 &
        SRV=$!
        trap "kill $SRV 2>/dev/null || true" EXIT
        sleep 3
        rm -rf lhci-report && mkdir -p lhci-report
        for i in 1 2 3; do
          npx lighthouse "$SITE_URL" --chrome-flags="--no-sandbox --headless=new" \
            --output json --output html --output-path "lhci-report/run-$i" --quiet \
            || echo "lighthouse run $i exited nonzero (tolerated on Windows — report is still written)"
        done
        node scripts/assert-lighthouse.cjs lhci-report/run-*.report.json
      '''
    }
  }
}

pipeline {
  agent any

  options {
    timeout(time: 45, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '25'))
    disableConcurrentBuilds(abortPrevious: true)
  }

  environment {
    CI = 'true'
    GITHUB_API = 'https://api.github.com'
    STATUS_CONTEXT = 'ci/jenkins/quality-gate'         // name used in branch protection
    SITE_URL = 'http://127.0.0.1:4173/portfolio-v2/'   // must match tests/config.ts
    // Tag MUST match the @playwright/test version pinned in package.json.
    PLAYWRIGHT_IMAGE = 'mcr.microsoft.com/playwright:v1.61.1-noble'
    // Inherit the toggle from Jenkins global/job env; default off.
    AUTO_CLOSE_ON_FAILURE = "${env.AUTO_CLOSE_ON_FAILURE ?: 'false'}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.REPO_SLUG = sh(
            script: "git config --get remote.origin.url | sed -E 's#(git@|https?://)([^/:]+)[:/]##; s#\\.git\$##'",
            returnStdout: true
          ).trim()
          // PR builds may check out an ephemeral merge commit; the status
          // must land on the PR head (second parent). Branch builds — and
          // PR builds with head-revision discovery — use HEAD. --verify -q
          // is essential: plain rev-parse echoes the unresolvable ref to
          // stdout, corrupting the captured value.
          if (env.CHANGE_ID) {
            env.COMMIT_SHA = sh(script: 'git rev-parse --verify --quiet HEAD^2 || git rev-parse HEAD', returnStdout: true).trim()
          } else {
            env.COMMIT_SHA = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
          }
          echo "Repo: ${env.REPO_SLUG} · Commit: ${env.COMMIT_SHA} · PR: ${env.CHANGE_ID ?: 'n/a'} · auto-close: ${env.AUTO_CLOSE_ON_FAILURE}"
        }
        githubStatus('pending', 'Quality gate running…')
      }
    }

    stage('Quality gate') {
      steps {
        script {
          boolean linuxDocker = isUnix() &&
            sh(script: 'docker version >/dev/null 2>&1', returnStatus: true) == 0
          if (linuxDocker) {
            echo "Running inside ${env.PLAYWRIGHT_IMAGE}"
            docker.image(env.PLAYWRIGHT_IMAGE).inside('-u root:root --ipc=host') {
              runQualityGate(true)
            }
          } else {
            echo 'No Linux Docker on this node — running the gate directly on the host (browsers cached after the first build).'
            runQualityGate(false)
          }
        }
      }
    }
  }

  post {
    always {
      junit testResults: 'test-results/junit.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'playwright-report/**, test-results/**, lhci-report/**, preview.log', allowEmptyArchive: true
      publishHTML(target: [
        reportName: 'Playwright Report',
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true
      ])
      publishHTML(target: [
        reportName: 'Lighthouse Report',
        reportDir: 'lhci-report',
        reportFiles: '*.html',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true
      ])
    }
    success {
      githubStatus('success', 'All checks passed — functional, visual, and Lighthouse.')
    }
    unstable {
      // Tests passed; new visual baselines were created (first run).
      githubStatus('success', 'Checks passed — new visual baselines created, commit them from build artifacts.')
    }
    failure {
      githubStatus('failure', 'Quality gate failed — see Jenkins build for reports.')
      script { autoClosePrIfEnabled() }
    }
    aborted {
      githubStatus('error', 'Build was aborted.')
    }
    cleanup {
      cleanWs(deleteDirs: true, notFailBuild: true)
    }
  }
}
