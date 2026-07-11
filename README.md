# Portfolio V2 — Soumadip Basu

Version 2 of the portfolio: all data and functionality migrated from **portfolio-master**
into the new terminal-inspired UI/UX design (JetBrains Mono + Space Grotesk, dark/light themes).

## Stack
- Vite 7 (vanilla JS, same stack as V1)
- Plain CSS with design tokens (`src/styles/`)
- No runtime dependencies

## Setup
```bash
npm install
```

Create a `.env` file in the project root (see `.env.example`):
```
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_WEB3FORMS_KEY=your-web3forms-access-key
```
`.env` is gitignored — keys are never committed and never appear in source files.
At build time each key is XOR-encoded into the bundle and decoded at runtime
(`src/modules/runtime-keys.js`), so the raw strings are not present verbatim in
the repository or the deployed assets. As with any fully static site, a client-side
key remains recoverable by a determined user — use free-tier/restricted keys only.

## Commands
| Command           | Purpose                                  |
|-------------------|------------------------------------------|
| `npm run dev`     | Local dev server → http://localhost:5173/portfolio-v2/ |
| `npm run build`   | Production build → `dist/`               |
| `npm run preview` | Preview the production build             |
| `npm run deploy`  | Publish `dist/` to GitHub Pages via gh-pages |

## Structure
```
index.html            page markup (all real content from portfolio-master)
public/               reused assets (photo, resume PDF, favicon)
src/
  main.js             entry — wires up all modules
  data/               content data (projects, certificates, chatbot context)
  modules/            one feature per file (theme, nav, hero, reveal, timeline,
                      projects, certifications, contact-form, widgets, chatbot)
  styles/             theme tokens, layout, components, chatbot, responsive
```

## Features carried over from V1
Theme toggle (persisted), smooth-scroll nav + scrollspy, mobile hamburger menu,
scroll-reveal + counters, project detail modals (back-button aware), certificate
verification modals, Web3Forms contact form, resume view/download (+ floating FAB),
scroll-to-top, cursor trail, and the Gemini AI chatbot (model fallback chain, retry,
typing indicator, conversation starters, history trimming).
