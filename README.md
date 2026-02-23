# Italian Experience

Static multi-page website (HTML/CSS/JS) for Italian Experience.

## Stack
- HTML/CSS/Vanilla JS
- Tailwind CSS (compiled file in `assets/css/tailwind.css`)
- Shared runtime utilities in `assets/js/site.js`

## How To Run
1. Install dependencies:
```bash
npm install
```

2. Start local server:
```bash
npm run start
```

3. Open:
```text
http://127.0.0.1:4173
```

Notes:
- `npm run start` uses `scripts/serve-static.mjs` (no external server dependency).
- Set custom host/port if needed:
```bash
HOST=0.0.0.0 PORT=8080 npm run start
```

## Quality Gates
- Full check:
```bash
npm run check
```

- Individual checks:
```bash
npm run check:links   # broken local links/assets
npm run check:audit   # static A11y/SEO/responsive sanity checks
npm run check:smoke   # file-based smoke checks on critical pages/features
```

## Test Command
```bash
npm test
```
(`npm test` runs `npm run check`)

## Project Structure (main)
- `index.html` home
- `travel/`, `recruitment/`, `flavors/`, `estates/`, `contact/` section pages
- `partials/header.html`, `partials/footer.html` shared layout fragments
- `assets/css/site.css` shared styles
- `assets/js/site.js` shared behaviors (nav/menu/reveal/shimmer)
- `scripts/` quality and utility scripts

## Browser/Device Targets
- Chrome, Safari, Firefox, Edge (latest 2)
- iPhone Safari, Android Chrome, iPad, laptop, desktop
