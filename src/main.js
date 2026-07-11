import './styles/style.css';

import { initThemeToggle } from './modules/theme.js';
import { initNav } from './modules/nav.js';
import { initTyping, initTestConsole, initPipeline } from './modules/hero.js';
import { initReveal, initCounters } from './modules/reveal.js';
import { initTimeline } from './modules/timeline.js';
import { initProjectFilter, initProjectModal } from './modules/projects.js';
import { initCertVerification } from './modules/certifications.js';
import { initContactForm } from './modules/contact-form.js';
import { initScrollTop, initCvFab, initCursorTrail } from './modules/widgets.js';
import { initChatbot } from './modules/chatbot.js';

initThemeToggle();
initNav();
initTyping();
initTestConsole();
initPipeline();
initReveal();
initCounters();
initTimeline();
initProjectFilter();
initProjectModal();
initCertVerification();
initContactForm();
initScrollTop();
initCvFab();
initCursorTrail();
initChatbot();

console.log('Portfolio V2 loaded successfully! ✨');
