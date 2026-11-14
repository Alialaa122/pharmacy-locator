# AGENTS.md

## Commands
- `npm run dev` — dev server on **port 3000** (hardcoded in vite.config.js, not 5173)
- `npm run lint` — oxlint (config in `.oxlintrc.json`; `react/rules-of-hooks` is an error)
- `npm run build` / `npm run preview`

- `npm run test` — vitest run (tests in `src/services/*.test.js`)
`src/services/test-*.js` are standalone Node scripts (top-level await) — run directly
with `node src/services/test-overpass.js`.

## Environment
- Google Maps API key must live in `.env` as `VITE_GOOGLE_MAPS_API_KEY` (Vite only
  exposes `VITE_*` to the client). The app won't render the map without a valid key;
  the key is read in `src/App.jsx`.
- `.env` is gitignored; never commit keys there. If `.env` is missing, create it from
  a locally provided key — don't hardcode it in source.

## Architecture
Single-page pharmacy locator. The agreed architecture lives in
`docs/ARCHITECTURE.md`; the layout (post-refactor):
- `App.jsx` — shared state + composition only.
- `src/lib/` — pure helpers: `geo.js` (haversine, coordinate conversion),
  `format.js` (display formatting), `categories.js` (data-only OSM category
  registry — add new categories here, one entry).
- `src/domain/pharmacyResults.js` — pure assembler producing the pharmacy
  result list (plain data only, no SDK objects).
- `src/services/` — one module per external provider: `placesService.js`
  (Google Places), `routingService.js` (Valhalla walking matrix),
  `osmService.js` (Overpass fetch/query — hits a **personal
  `overpass.nextgis.com` mirror**, not public `overpass-api.de`) and
  `osmNormalize.js` (raw OSM → uniform feature shape).
- `src/hooks/useGeographicFeatures.js` — Overpass request state.
- `src/components/` — `PharmacySearch` (pipeline orchestrator),
  `map/OsmLayer.jsx`, plus panels. Google Maps rendering (`@vis.gl/...`)
  is used directly by map components only; `useMapsLibrary("places")` in
  `PharmacySearch`.

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
