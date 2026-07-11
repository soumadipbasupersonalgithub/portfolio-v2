// Certificate verification modal — same behavior as V1, restyled for the terminal theme
import { certificateData } from '../data/certificates.js';

export function initCertVerification() {
  const buttons = document.querySelectorAll('.cert-verify-btn');

  const removeModal = () => {
    const el = document.querySelector('.verification-modal');
    if (el) {
      el.remove();
      document.body.style.overflow = '';
    }
  };

  // Back button closes the verification modal and returns to the section
  window.addEventListener('popstate', () => {
    const el = document.querySelector('.verification-modal');
    if (!el) return;
    removeModal();
    const certSection = document.getElementById('certifications');
    if (certSection) {
      const top = certSection.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });

  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const certId = button.getAttribute('data-cert-id');
      const cert = certificateData[certId];
      if (!cert) return;

      const html = `
        <div class="verification-modal">
          <div class="verification-card window">
            <div class="window-bar">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
              <span class="window-title">certificate --verify</span>
              <button class="close-verification modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="verification-body">
              <div class="verification-check">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12 2.5 2.5 5-5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                Certificate Verified ✓
              </div>
              <h4 class="verification-title">${cert.title}</h4>
              <div class="verification-issuer">Issued by: ${cert.issuer}</div>
              <div class="verification-meta">
                <div><strong>status</strong>&nbsp;&nbsp;<span class="ok">${cert.status}</span></div>
                <div><strong>issued</strong>&nbsp;&nbsp;${cert.issuedDate}</div>
                <div><strong>expires</strong>&nbsp;${cert.expiryDate}</div>
              </div>
              <p class="verification-note">This course completion certificate has been verified against the issuer's database. The credential is authentic and current.</p>
              <div class="verification-actions">
                <a href="${cert.verificationUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">view certificate ↗</a>
                <button class="close-verification btn btn-secondary">close</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', html);
      const modalEl = document.querySelector('.verification-modal');
      document.body.style.overflow = 'hidden';
      window.history.pushState({ verificationOpen: true }, '', window.location.href);

      // Close controls route through history so the popstate handler runs
      modalEl.querySelectorAll('.close-verification').forEach(btn => {
        btn.addEventListener('click', () => window.history.back());
      });
      modalEl.addEventListener('click', (e2) => {
        if (e2.target === modalEl) window.history.back();
      });
      const escapeHandler = (e2) => {
        if (e2.key === 'Escape') {
          window.history.back();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    });
  });
}
