# Layout Practice

A webapp to practice graphic design fundamentals with simple black shapes on a white canvas. Get AI critique after each round. No accounts — data stays in the browser.

**Live:** https://graphic-shapes.vercel.app

## How to run locally

- **Option 1:** Open `index.html` directly in your browser (double-click or drag into Chrome/Safari).
  - Note: the AI critique requires a server (see Option 2 or deploy to Vercel).
- **Option 2:** Serve the folder with any static server, e.g.  
  `npx serve .` or `python3 -m http.server 8000` then open the URL.

## Deploy on Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com), **Add New Project** → Import your repo.
3. Add your Anthropic API key as an environment variable: `ANTHROPIC_API_KEY`.
4. Deploy. The `api/critique.js` serverless function will handle AI critiques.

## Add to your phone

1. Open the deployed app in your phone's browser.
2. Use **Add to Home Screen** (Share → Add to Home Screen in Safari).
3. Open from your home screen like an app.

## How it works

- **Canvas:** A random set of shapes (squares, circles, triangles). Tap to select, then resize (corner handles) or rotate (↻ handle).
- **Submit:** Sends a snapshot of your canvas to Claude via the Vercel API route.
- **Critique:** AI feedback across 5 design dimensions: Emphasis, Balance, Proportion, Movement, and White Space — grounded in `DESIGN_PRINCIPLES.md`.
- **Last critique:** Shown as a collapsible accordion below the canvas on your next round, constrained to the canvas width.

## Architecture

- `index.html` / `css/style.css` / `js/` — static frontend (no build step)
- `api/critique.js` — Vercel serverless function; proxies canvas image to Claude, validates input size (max ~3.75 MB), and returns structured JSON critique
- `DESIGN_PRINCIPLES.md` — source of truth for the critique rubric

## Data and privacy

- Layout data is stored in the user's browser (localStorage).
- Canvas images are sent to the Anthropic API for critique and are not stored server-side.
- No accounts, no passwords.
