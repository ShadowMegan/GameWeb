# AGENTS.md

Single-package React + Vite frontend (JavaScript, not TypeScript). Still on the Vite starter template in `src/App.jsx`; GameWeb features have not been built yet.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run lint` — `eslint .` (only verification step; no typecheck)
- `npm run preview` — serve the built `dist/`

There is no test runner or test script configured. Do not invent `npm test`; add a runner first if tests are needed.

## Toolchain quirks

- No TypeScript. Write `.jsx`/`.js`. `@types/*` are installed but unused — don't add `.ts`/`.tsx` files or `tsc` scripts.
- Tailwind v4 via the `@tailwindcss/vite` plugin. Entry is the single line `@import "tailwindcss"` in `src/index.css`. There is no `tailwind.config.js` or PostCSS config — configure theme/tokens in CSS (`@theme`), not a JS config.
- No router, state library, API client, or `.env` usage yet. Don't assume an existing backend/API layer.
- `eslint.config.js` is flat config and ignores `dist/`. `eslint-plugin-react-refresh` is enabled: files exporting components must only export components, or fast refresh is reported as an error.

## Conventions

- Entry point: `index.html` -> `src/main.jsx` -> `src/App.jsx`. Root `src/index.css` (Tailwind), component styles in `src/App.css` (plain CSS with nesting).
- Static assets: `src/assets/` are imported as modules; `public/` files are referenced by absolute URL (e.g. `/icons.svg#...`).
- `dist/` is a build artifact and gitignored; never edit it.
