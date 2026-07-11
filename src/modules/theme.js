// Theme toggle — dark by default on open, persisted under a V2-specific key
export function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const getTheme = () => localStorage.getItem('portfolio-v2-theme') || 'dark';
  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-v2-theme', theme);
  };

  setTheme(getTheme());

  toggle.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
}
