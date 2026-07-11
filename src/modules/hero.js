// Hero animations: terminal typing loop + simulated playwright test-run console
export function initTyping() {
  const el = document.getElementById('typed');
  if (!el) return;

  const phrases = [
    'mastering the art of breaking code to build bulletproof applications.',
    'expert in functional, API & UI automation testing.',
    'testing across web, mobile & hybrid platforms.',
    '6+ years engineering software quality.'
  ];

  let pi = 0, ci = 0, deleting = false;
  const tick = () => {
    const s = phrases[pi];
    if (!deleting) {
      ci++;
      el.textContent = s.slice(0, ci);
      if (ci >= s.length) { deleting = true; setTimeout(tick, 1700); return; }
      setTimeout(tick, 46);
    } else {
      ci--;
      el.textContent = s.slice(0, ci);
      if (ci <= 0) { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(tick, 320); return; }
      setTimeout(tick, 22);
    }
  };
  tick();
}

export function initTestConsole() {
  const body = document.getElementById('runBody');
  const bar = document.getElementById('runBar');
  if (!body) return;

  const suites = [
    ['tests/api/auth.spec.ts', 12],
    ['tests/ui/checkout.spec.ts', 9],
    ['tests/mobile/login.e2e.ts', 7],
    ['tests/ble/sync.spec.ts', 6],
    ['tests/web/portal.spec.ts', 11]
  ];

  let i = 0;
  const render = () => {
    if (i === 0) { body.innerHTML = ''; if (bar) bar.style.width = '0'; }
    if (i < suites.length) {
      const [file, count] = suites[i];
      const row = document.createElement('div');
      row.className = 'run-row';
      row.innerHTML = `<span class="run-pass">PASS</span> <span class="t-text2">${file}</span> <span class="t-dim">(${count})</span>`;
      body.appendChild(row);
      i++;
      setTimeout(render, 600);
    } else {
      const sum = document.createElement('div');
      sum.className = 'run-summary';
      sum.textContent = '✓ 45 passed · 0 failed · 4.2s';
      body.appendChild(sum);
      if (bar) bar.style.width = '94%';
      i = 0;
      setTimeout(render, 2800);
    }
  };
  render();
}

export function initPipeline() {
  const stages = Array.from(document.querySelectorAll('[data-stage]'));
  if (!stages.length) return;

  let k = 0;
  const step = () => {
    stages.forEach((s, idx) => {
      const done = idx < k, active = idx === k;
      s.style.color = done ? 'var(--accent-ink)' : active ? 'var(--text)' : 'var(--dim)';
      s.style.borderColor = (done || active) ? 'var(--accent)' : 'var(--border)';
      const dot = s.querySelector('[data-dot]');
      if (dot) {
        dot.style.background = (done || active) ? 'var(--accent)' : 'var(--border)';
        dot.style.animation = active ? 'pulseDot 1s infinite' : 'none';
      }
    });
    k = (k + 1) % (stages.length + 1);
    setTimeout(step, 780);
  };
  step();
}
