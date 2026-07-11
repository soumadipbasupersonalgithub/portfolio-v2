// Navigation: scroll effect, mobile menu, smooth anchor scrolling, scrollspy
export function initNav() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');
  const anchorButtons = document.querySelectorAll('.btn[href^="#"], .footer-top, .nav-brand');

  // Navbar shadow on scroll
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // Mobile menu toggle
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('active');
    navMenu.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', String(open));
  });

  const closeMenu = () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  };

  const scrollToTarget = (targetId) => {
    const targetSection = document.querySelector(targetId);
    if (!targetSection) return;
    const navHeight = navbar.offsetHeight;
    const targetPosition = targetSection.getBoundingClientRect().top + window.scrollY - navHeight + 4;
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
  };

  // Nav links: close menu, then smooth scroll
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      closeMenu();
      setTimeout(() => {
        scrollToTarget(targetId);
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }, 150);
    });
  });

  // Hero/contact buttons + brand + back-to-top smooth scroll
  anchorButtons.forEach(button => {
    const targetId = button.getAttribute('href');
    if (!targetId || !targetId.startsWith('#')) return;
    button.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToTarget(targetId);
    });
  });

  // Escape closes mobile menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Scrollspy — highlight the most visible section's nav link
  const sections = document.querySelectorAll('section[id]');
  const spy = new IntersectionObserver((entries) => {
    let maxRatio = 0;
    let activeEntry = null;
    entries.forEach(entry => {
      if (entry.intersectionRatio > maxRatio) {
        maxRatio = entry.intersectionRatio;
        activeEntry = entry;
      }
    });
    if (activeEntry && maxRatio > 0.1) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-nav') === activeEntry.target.id);
      });
    }
  }, { threshold: [0.1, 0.5, 0.7], rootMargin: '-20% 0px -30% 0px' });

  sections.forEach(section => spy.observe(section));
}
