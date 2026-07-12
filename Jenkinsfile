/*
 * Quality gate for portfolio-v2 pull requests.
 *
 * Stages: Checkout → Install → Build & Serve → Playwright functional →
 * Playwright visual → Lighthouse CI → publish reports → GitHub commit
 * status → (optional) auto-close PR on failure.
 *
 * Requirements (see docs/JENKINS_SETUP.md):
 *  - Docker available on the Jenkins agent (Playwright image = browsers preinstalled).
 *  - A "Secret text" credential with ID `github-pat` holding a GitHub PAT
 *    (classic: `repo` scope; fine-grained: Statuses RW + Pull requests RW).
 *  - Plugins: GitHub, GitHub Branch Source, Pipeline, Docker Pipeline,
 *    Credentials Binding, HTML Publisher, JUnit.
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
      sh label: "GitHub status: ${state}", script: '''
        curl -sf -o /dev/null -X POST \
          -H "Accept: application/vnd.github+json" \
          -H "Authorization: Bearer $GITHUB_TOKEN" \
          "$GITHUB_API/repos/$REPO_SLUG/statuses/$COMMIT_SHA" \
          -d "{\\"state\\":\\"$GH_STATE\\",\\"context\\":\\"$STATUS_CONTEXT\\",\\"description\\":\\"$GH_DESC\\",\\"target_url\\":\\"$BUILD_URL\\"}"
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

pipeline {
  // Playwright image ships all browsers + deps. Tag MUST match the
  // @playwright/test version pinned in package.json (currently 1.61.1).
  // No Docker? See docs/JENKINS_SETUP.md §"Running without Docker".
  agent {
    docker {
      image 'mcr.microsoft.com/playwright:v1.61.1-noble'
      args '-u root:root --ipc=host'
    }
  }

  options {
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '25'))
    disableConcurrentBuilds(abortPrevious: true)
  }

  environment {
    CI = 'true'
    GITHUB_API = 'https://api.github.com'
    STATUS_CONTEXT = 'ci/jenkins/quality-gate'         // name used in branch protection
    SITE_URL = 'http://127.0.0.1:4173/portfolio-v2/'   // must match tests/config.ts
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
          // must land on the PR head (second parent). Branch builds use HEAD.
          if (env.CHANGE_ID) {
            env.COMMIT_SHA = sh(script: 'git rev-parse HEAD^2 2>/dev/null || git rev-parse HEAD', returnStdout: true).trim()
          } else {
            env.COMMIT_SHA = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
          }
          echo "Repo: ${env.REPO_SLUG} · Commit: ${env.COMMIT_SHA} · PR: ${env.CHANGE_ID ?: 'n/a'} · auto-close: ${env.AUTO_CLOSE_ON_FAILURE}"
        }
        githubStatus('pending', 'Quality gate running…')
      }
    }

    stage('Install') {
      steps {
        sh 'node --version && npm --version'
        sh 'npm ci'
      }
    }

    stage('Build & Serve') {
      steps {
        // No .env in CI: the site builds with empty API keys, which is fine —
        // tests mock external APIs instead of calling them.
        sh 'npm run build'
        sh label: 'Start static server for the PR build', script: '''
          nohup npx vite preview --host 0.0.0.0 --port 4173 --strictPort > preview.log 2>&1 &
          for i in $(seq 1 30); do
            if curl -sf -o /dev/null "$SITE_URL"; then echo "Server is up: $SITE_URL"; exit 0; fi
            sleep 1
          done
          echo 'Server failed to start:' && cat preview.log && exit 1
        '''
      }
    }

    stage('Playwright — functional (desktop/tablet/mobile)') {
      steps {
        sh 'npx playwright test tests/functional'
      }
    }

    stage('Playwright — visual regression') {
      steps {
        script {
          // CI runs on Linux, so only Linux baselines gate the build.
          def hasBaselines = sh(
            script: 'ls tests/visual/__screenshots__/*/linux/*.png >/dev/null 2>&1',
            returnStatus: true
          ) == 0
          if (hasBaselines) {
            // Strict: any pixel diff beyond the tolerance fails the build.
            sh 'npx playwright test tests/visual'
          } else {
            // First run: Playwright writes the missing baselines but reports
            // the tests as failed ("snapshot doesn't exist"). Tolerate that
            // once — mark UNSTABLE and hand the baselines over as artifacts.
            catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
              sh 'npx playwright test tests/visual'
            }
            archiveArtifacts artifacts: 'tests/visual/__screenshots__/**', allowEmptyArchive: true
            unstable('No visual baselines existed — they were auto-created. Download tests/visual/__screenshots__/** from this build\'s artifacts and commit them to lock in the current look.')
          }
        }
      }
    }

    stage('Lighthouse CI') {
      steps {
        // Reuse Playwright's Chromium so no separate Chrome install is needed.
        sh label: 'Run Lighthouse assertions', script: '''
          export CHROME_PATH="$(node -e "console.log(require('playwright-core').chromium.executablePath())")"
          echo "Lighthouse using Chrome at: $CHROME_PATH"
          LHCI_URL="$SITE_URL" npx lhci autorun --config=lighthouserc.cjs
        '''
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
