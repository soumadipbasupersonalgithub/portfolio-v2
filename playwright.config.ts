import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { SITE, VIEWPORTS, VISUAL } from './tests/config';

const CI = !!process.env.CI;

// Deterministic text rendering for visual comparisons: without these,
// Chromium may switch between GPU and software rasterization under parallel
// load, changing font antialiasing enough to fail screenshot diffs.
const chromiumLaunchOptions = {
  args: [
    '--disable-gpu',
    '--disable-lcd-text',
    '--force-color-profile=srgb',
    '--font-render-hinting=none',
  ],
};

export default defineConfig({
  testDir: './tests',
  // WebKit is slow when many browsers run in parallel; 30s (the default)
  // is occasionally exceeded by healthy tests under full-suite load.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ...(CI ? [['junit', { outputFile: 'test-results/junit.xml' }] as const] : []),
  ],

  // Visual baselines are stored per project (viewport) and per platform, so
  // Linux baselines from CI and local Windows/macOS baselines never collide.
  snapshotPathTemplate:
    '{testDir}/visual/__screenshots__/{projectName}/{platform}/{arg}{ext}',

  // 'missing' writes absent baselines (the test still reports as failed so
  // you notice — the Jenkins pipeline tolerates exactly that case on a first
  // run and marks the build UNSTABLE instead). Diffs always fail. Explicit
  // because CI would otherwise refuse to write new baselines at all.
  updateSnapshots: 'missing',

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: VISUAL.maxDiffPixelRatio,
      animations: 'disabled',
      caret: 'hide',
      // Freezes time-varying elements (typing loop, simulated test console)
      // during capture so layout is deterministic — see the CSS file.
      stylePath: fileURLToPath(new URL('./tests/visual/screenshot.css', import.meta.url)),
    },
  },

  use: {
    baseURL: SITE.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices[VIEWPORTS.desktop.device],
        viewport: VIEWPORTS.desktop.viewport,
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: 'tablet',
      use: { ...devices[VIEWPORTS.tablet.device] }, // WebKit — no Chromium flags
    },
    {
      name: 'mobile',
      use: {
        ...devices[VIEWPORTS.mobile.device],
        launchOptions: chromiumLaunchOptions,
      },
    },
  ],

  // Builds and serves the PR branch's code (never the live site). In CI the
  // Jenkinsfile starts this server itself; reuseExistingServer picks it up.
  webServer: {
    command: `npm run build && npm run preview -- --port ${SITE.port} --strictPort`,
    url: SITE.baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
