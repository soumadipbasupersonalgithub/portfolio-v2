// ============================================
// AI CHATBOT — Gemini integration
// Functionality migrated from V1; UI redesigned for the terminal theme.
// The API key comes from environment configuration (.env → VITE_GEMINI_API_KEY),
// XOR-encoded at build time and decoded here — never hardcoded in source.
// ============================================
import { PORTFOLIO_CONTEXT } from '../data/chatbot-context.js';
import { decodeKey } from './runtime-keys.js';

const GEMINI_API_KEY = decodeKey(__GEMINI_KEY__);

// Models to try in order (fallback chain). The "-latest" aliases track
// Google's current flash models, so the chain keeps working when a
// pinned model is sunset for new API keys.
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest'
];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function initChatbot() {
  const fab = document.getElementById('chatbotFab');
  const chatWindow = document.getElementById('chatbotWindow');
  const closeBtn = document.getElementById('chatbotClose');
  const messagesContainer = document.getElementById('chatbotMessages');
  const input = document.getElementById('chatbotInput');
  const sendBtn = document.getElementById('chatbotSend');
  const starterBtns = document.querySelectorAll('.chatbot-starter-btn');
  const backdrop = document.getElementById('chatbotBackdrop');

  if (!fab || !chatWindow) return;

  let conversationHistory = [];
  let isOpen = false;

  // ---------- Open / close with animation ----------
  const openChat = () => {
    isOpen = true;
    fab.classList.add('hidden');
    document.body.classList.add('chatbot-open');
    if (backdrop) backdrop.classList.add('visible');

    chatWindow.classList.remove('closing');
    chatWindow.classList.add('opening');
    chatWindow.style.visibility = 'visible';

    chatWindow.addEventListener('animationend', function handler() {
      chatWindow.removeEventListener('animationend', handler);
      chatWindow.classList.remove('opening');
      chatWindow.classList.add('open');
    });

    setTimeout(() => input.focus(), 500);
  };

  const closeChat = () => {
    isOpen = false;
    document.body.classList.remove('chatbot-open');
    if (backdrop) backdrop.classList.remove('visible');

    chatWindow.classList.remove('open');
    chatWindow.classList.add('closing');

    chatWindow.addEventListener('animationend', function handler() {
      chatWindow.removeEventListener('animationend', handler);
      chatWindow.classList.remove('closing');
      chatWindow.style.visibility = 'hidden';
      fab.classList.remove('hidden');
    });
  };

  fab.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);
  if (backdrop) backdrop.addEventListener('click', closeChat);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeChat();
  });

  // ---------- Prevent scroll bleed to the page ----------
  chatWindow.addEventListener('wheel', (e) => {
    const el = messagesContainer;
    const atTop = el.scrollTop === 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
      e.preventDefault();
    }
  }, { passive: false });

  let touchStartY = 0;
  chatWindow.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  chatWindow.addEventListener('touchmove', (e) => {
    const el = messagesContainer;
    const touchY = e.touches[0].clientY;
    const delta = touchStartY - touchY;
    const atTop = el.scrollTop === 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    if ((atTop && delta < 0) || (atBottom && delta > 0)) {
      e.preventDefault();
    }
  }, { passive: false });

  // ---------- Message rendering ----------
  const clearWelcomeScreen = () => {
    const welcome = messagesContainer.querySelector('.chatbot-welcome');
    if (welcome) welcome.remove();
  };

  const scrollToBottom = () => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  const addMessage = (text, type) => {
    const msg = document.createElement('div');
    msg.className = `chatbot-msg ${type}`;
    msg.innerHTML = text;
    messagesContainer.appendChild(msg);
    scrollToBottom();
    return msg;
  };

  const showTyping = () => {
    const typing = document.createElement('div');
    typing.className = 'chatbot-typing';
    typing.id = 'chatbotTyping';
    typing.innerHTML = '<span class="chatbot-typing-dot"></span><span class="chatbot-typing-dot"></span><span class="chatbot-typing-dot"></span>';
    messagesContainer.appendChild(typing);
    scrollToBottom();
  };

  const removeTyping = () => {
    const typing = document.getElementById('chatbotTyping');
    if (typing) typing.remove();
  };

  // Basic markdown → HTML for AI responses
  const formatResponse = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^[-•]\s+(.+)/gm, '<br>&bull; $1')
      .replace(/^\d+\.\s+(.+)/gm, '<br>$1')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .trim();
  };

  // ---------- Gemini API with model fallback + retry ----------
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const callModel = async (model, requestBody) => {
    const url = `${API_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (response.status === 429) {
      const err = new Error('RATE_LIMITED');
      err.status = 429;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`API_ERROR_${response.status}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  };

  const callGemini = async (userMessage) => {
    if (!GEMINI_API_KEY) {
      return 'The AI assistant is currently unavailable. Please contact Soumadip directly at soumadipbasu333@gmail.com';
    }

    conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    const requestBody = {
      contents: [
        { role: 'user', parts: [{ text: PORTFOLIO_CONTEXT }] },
        { role: 'model', parts: [{ text: 'Understood! I am Soumadip Basu\'s AI portfolio assistant. I will answer questions based on his portfolio information in a friendly and professional manner. How can I help you?' }] },
        ...conversationHistory
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };

    let lastError = null;

    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const aiText = await callModel(model, requestBody);
          if (aiText) {
            conversationHistory.push({ role: 'model', parts: [{ text: aiText }] });
            if (conversationHistory.length > 20) {
              conversationHistory = conversationHistory.slice(-20);
            }
            return aiText;
          }
        } catch (err) {
          lastError = err;
          if (err.status === 429 && attempt === 0) {
            await wait(3000);
            continue;
          }
          if (err.status === 429) break;
          throw err;
        }
      }
    }

    if (lastError?.status === 429) {
      const rateErr = new Error('ALL_MODELS_RATE_LIMITED');
      rateErr.isRateLimit = true;
      throw rateErr;
    }

    throw lastError || new Error('No response generated');
  };

  // ---------- Send flow ----------
  const sendMessage = async (text) => {
    const message = text || input.value.trim();
    if (!message) return;

    clearWelcomeScreen();
    addMessage(message, 'user');
    input.value = '';
    sendBtn.disabled = true;
    showTyping();

    try {
      const response = await callGemini(message);
      removeTyping();
      addMessage(formatResponse(response), 'bot');
    } catch (error) {
      console.error('Chatbot error:', error);
      removeTyping();
      if (error.isRateLimit) {
        addMessage('I\'m getting a lot of traffic right now! Please wait a minute and try again. In the meantime, feel free to explore the portfolio sections above or contact Soumadip at <strong>soumadipbasu333@gmail.com</strong>', 'error');
      } else {
        addMessage('Sorry, I encountered an error. Please try again or contact Soumadip directly at <strong>soumadipbasu333@gmail.com</strong>', 'error');
      }
      // Roll back the user message so retries work cleanly
      if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'user') {
        conversationHistory.pop();
      }
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  };

  sendBtn.addEventListener('click', () => sendMessage());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  starterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sendMessage(btn.getAttribute('data-question'));
    });
  });
}
