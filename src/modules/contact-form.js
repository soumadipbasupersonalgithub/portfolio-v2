// Contact form — Web3Forms integration (same service as V1). The access key
// comes from .env (VITE_WEB3FORMS_KEY), XOR-encoded at build time.
import { decodeKey } from './runtime-keys.js';

const WEB3FORMS_KEY = decodeKey(__WEB3FORMS_KEY__);

export function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const formStatus = document.getElementById('form-status');

    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const message = form.querySelector('#message').value.trim();

    const showStatus = (type, text) => {
      if (!formStatus) return;
      formStatus.className = `form-status ${type}`;
      formStatus.textContent = text;
    };

    if (!name || !email || !message) {
      showStatus('error', '❌ Please fill in all fields.');
      return;
    }

    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline-flex';
    if (formStatus) formStatus.className = 'form-status';

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Portfolio Contact: ${name}`,
          from_name: name,
          email: email,
          message: message
        })
      });

      const result = await response.json();

      if (result.success) {
        showStatus('success', '✅ Message sent successfully! I will get back to you soon.');
        form.reset();
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      showStatus('error', '❌ Failed to send message. Please try again or contact me directly at soumadipbasu333@gmail.com');
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (btnLoading) btnLoading.style.display = 'none';
      setTimeout(() => {
        if (formStatus) formStatus.className = 'form-status';
      }, 7000);
    }
  });
}
