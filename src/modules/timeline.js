// Work-experience timeline: click a role to expand its details
export function initTimeline() {
  const items = Array.from(document.querySelectorAll('[data-exp]'));
  if (!items.length) return;

  const activate = (idx) => {
    items.forEach((item, i) => {
      const on = i === idx;
      item.classList.toggle('active', on);
      const panel = item.querySelector('[data-exp-detail]');
      if (panel) {
        panel.style.maxHeight = on ? panel.scrollHeight + 'px' : '0';
        panel.style.opacity = on ? '1' : '0';
      }
    });
  };

  items.forEach((item, i) => {
    item.addEventListener('click', () => activate(i));
  });

  activate(0);

  // Keep the expanded panel sized correctly on viewport changes
  window.addEventListener('resize', () => {
    const openIdx = items.findIndex(item => item.classList.contains('active'));
    if (openIdx >= 0) activate(openIdx);
  });
}
