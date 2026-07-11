// Floating widgets: scroll-to-top, CV download button feedback, cursor trail
export function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

export function initCvFab() {
  const cvButton = document.querySelector('.fab-button');
  if (!cvButton) return;

  cvButton.addEventListener('click', () => {
    cvButton.classList.add('launched');

    const fabText = cvButton.querySelector('.fab-text');
    const originalText = fabText ? fabText.textContent : '';
    if (fabText) fabText.textContent = '✓ done';

    const icon = cvButton.querySelector('.fab-icon');
    if (icon) icon.style.animation = 'iconBounceDown 0.5s ease';

    setTimeout(() => {
      if (fabText) fabText.textContent = originalText;
      cvButton.classList.remove('launched');
      if (icon) icon.style.animation = '';
    }, 2500);
  });
}

// Subtle cursor trail on desktop (ported from V1, recolored to the accent)
export function initCursorTrail() {
  if (window.innerWidth <= 768 || 'ontouchstart' in window) return;

  const trail = [];
  const trailLength = 10;

  for (let i = 0; i < trailLength; i++) {
    const dot = document.createElement('div');
    dot.className = 'cursor-trail';
    dot.style.cssText = `
      position: fixed;
      width: 4px;
      height: 4px;
      background: var(--accent);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      opacity: ${(trailLength - i) / trailLength};
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(dot);
    trail.push(dot);
  }

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const animateTrail = () => {
    let x = mouseX;
    let y = mouseY;

    trail.forEach((dot, index) => {
      const nextDot = trail[index + 1] || trail[0];
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      x += (parseInt(nextDot.style.left) || mouseX - x) * 0.3;
      y += (parseInt(nextDot.style.top) || mouseY - y) * 0.3;
    });

    requestAnimationFrame(animateTrail);
  };

  animateTrail();
}
