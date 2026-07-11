// Projects: category filter + details modal (with back-button support, as in V1)
import { projectData } from '../data/projects.js';

export function initProjectFilter() {
  const chips = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('[data-cat]'));
  if (!chips.length) return;

  const setActive = (filter) => {
    chips.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-filter') === filter);
    });
    cards.forEach(card => {
      const show = filter === 'all' || card.getAttribute('data-cat') === filter;
      card.style.display = show ? '' : 'none';
    });
  };

  chips.forEach(chip => {
    chip.addEventListener('click', () => setActive(chip.getAttribute('data-filter')));
  });
  setActive('all');
}

export function initProjectModal() {
  const modal = document.getElementById('projectModal');
  const modalContent = document.getElementById('modalContent');
  const closeBtn = modal.querySelector('.close');

  function openProjectModal(projectKey) {
    const project = projectData[projectKey];
    if (!project) return;

    modalContent.innerHTML = `
      <div class="project-detail">
        <h2 class="project-detail-title">${project.title}</h2>
        <span class="parent-company-tag">${project.company}</span>
        <h3 class="project-detail-subtitle">// roles &amp; responsibilities</h3>
        <div class="project-detail-overview">${project.overview}</div>
        <h3 class="project-detail-subtitle">// tools &amp; technologies</h3>
        <div class="project-tech-grid">
          ${project.technologies.map(tech => `<span class="tech-badge">${tech}</span>`).join('')}
        </div>
      </div>
    `;

    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';

    // Back button closes the modal instead of navigating away
    window.history.pushState({ modalOpen: true, projectKey }, '', window.location.href);
  }

  function closeProjectModal() {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (window.history.state && window.history.state.modalOpen) {
        window.history.back();
      }
    }, 300);
  }

  // Open via any project-link button
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.project-link');
    if (link) {
      e.preventDefault();
      const projectKey = link.getAttribute('data-project');
      if (projectKey) openProjectModal(projectKey);
    }
  });

  closeBtn.addEventListener('click', closeProjectModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProjectModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) closeProjectModal();
  });

  // Browser back button
  window.addEventListener('popstate', () => {
    if (modal.classList.contains('show')) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }, 300);
    }
  });
}
