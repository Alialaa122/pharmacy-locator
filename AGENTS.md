# AGENTS.md

## Commands
- `npm run dev` — dev server on **port 3000** (hardcoded in vite.config.js, not 5173)
- `npm run lint` — oxlint (config in `.oxlintrc.json`; `react/rules-of-hooks` is an error)
- `npm run build` / `npm run preview`

No test suite yet; a vitest runner is planned (step 2 of the roadmap in
`docs/ARCHITECTURE.md`). Until then, don't invent `npm test`.
`src/services/test-*.js` are standalone Node scripts (top-level await) — run directly
with `node src/services/test-overpass.js`.

## Environment
- Google Maps API key must live in `.env` as `VITE_GOOGLE_MAPS_API_KEY` (Vite only
  exposes `VITE_*` to the client). The app won't render the map without a valid key;
  the key is read in `src/App.jsx`.
- `.env` is gitignored; never commit keys there. If `.env` is missing, create it from
  a locally provided key — don't hardcode it in source.

## Architecture
Single-page pharmacy locator (`src/App.jsx` is the only real entrypoint):
- Google Maps via `@vis.gl/react-google-maps`; `places`/geometry libraries load
  lazily with `useMapsLibrary(...)` — don't import map libraries statically.
- Pharmacy search: `src/services/pharmacyService.js` (Places API + haversine).
- OSM features (buildings, amenities, transit): `src/services/geographicService.js`
  normalizing Overpass API results; Overpass queries hit a **personal
  `overpass.nextgis.com` mirror**, not public `overpass-api.de`.
  `src/services/osm-data.json` is a sample of the raw Overpass response shape.

## Refactoring Workflow
The agreed target architecture lives in `docs/ARCHITECTURE.md` — read it before
refactoring. For every architectural or refactoring change, follow this loop in order:

**Plan → Understand → Implement → Review → Test → Commit**

- **Plan** — pick ONE roadmap step; state the expected outcome and any deliberate
  behavior change (behavior changes must be documented in docs/ARCHITECTURE.md).
- **Understand** — read the affected code fully before touching it; no blind edits.
- **Implement** — smallest change that completes the step; no extra refactoring mixed in.
- **Review** — re-read the diff; verify behavior matches the plan step.
- **Test** — run `npm run lint` plus tests (vitest, once installed); verify edge cases
  from docs/ARCHITECTURE.md §6 in the browser.
- **Commit** — one small, focused commit per step.
