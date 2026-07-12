/**
 * Asserts Lighthouse category scores against the thresholds defined in
 * lighthouserc.cjs (single source of truth).
 *
 * Used on Windows hosts where `lhci autorun` crashes in chrome-launcher's
 * temp-profile cleanup AFTER the audit completes and the report is written —
 * the pipeline runs `lighthouse` directly (tolerating its exit code) and
 * verifies the written reports here. Takes the median across runs.
 *
 * Usage: node scripts/assert-lighthouse.cjs lhci-report/run-*.report.json
 */
const fs = require('fs');
const { thresholds } = require('../lighthouserc.cjs');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('assert-lighthouse: no report files given — did the Lighthouse runs produce output?');
  process.exit(1);
}

const runs = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const median = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];

let failed = false;
for (const [category, min] of Object.entries(thresholds)) {
  const scores = runs.map((r) => {
    const c = r.categories && r.categories[category];
    if (!c || typeof c.score !== 'number') {
      console.error(`assert-lighthouse: category "${category}" missing from a report`);
      process.exit(1);
    }
    return c.score;
  });
  const m = median(scores);
  const ok = m >= min;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${category}: median ${m.toFixed(2)} ` +
      `(runs: ${scores.map((s) => s.toFixed(2)).join(', ')}) — required ≥ ${min}`,
  );
}

process.exit(failed ? 1 : 0);
