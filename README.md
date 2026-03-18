# Layout Practice

A webapp to practice graphic design fundamentals with simple black shapes. **Deploy on Vercel** when you’re done — the app is static and works there. No accounts, no server-side storage; data stays in the browser (localStorage) on each user’s device.

## How to run locally

- **Option 1:** Open `index.html` directly in your browser (double-click or drag into Chrome/Safari).
- **Option 2:** Serve the folder with any static server, e.g.  
  `npx serve .` or `python3 -m http.server 8000` then open the URL.

## Deploy on Vercel

1. Push this repo to GitHub (e.g. `chrayons/graphic-shapes`).
2. In [Vercel](https://vercel.com), **Add New Project** → Import your repo.
3. Leave build settings as default (no build command needed for static HTML/JS/CSS).
4. Deploy. Your app will be live at a `*.vercel.app` URL.

## Add to your phone

1. Open the deployed app (or your local URL) in your phone’s browser.
2. Use the browser’s **Add to Home Screen** (e.g. Share → Add to Home Screen in Safari).
3. Open from your home screen like an app. Data is stored in the browser on that device.

## Features

- **Canvas:** Random set of 5–10 shapes (squares, circles, triangles). Tap to select, then resize (handles) or rotate (↻).
- **Daily challenge:** 3 layouts per day, then feedback.
- **Gallery:** Trios by date; scroll back through your history.
- **Export / Import:** In the gallery, use **Export backup** to download a JSON file. Use **Import backup** to restore from that file (e.g. after clearing data or on a new device).

## Data and privacy

- All layout/gallery data is stored in the user’s browser (localStorage).
- No accounts, no passwords, no data sent to your server — Vercel only serves the static files.
- Users can **Export backup** to download a JSON file and **Import backup** to restore (e.g. on another device).
