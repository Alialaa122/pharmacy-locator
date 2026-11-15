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
Two screens — a landing page (`/`) and the map application (`/app`).
The agreed architecture lives in `docs/ARCHITECTURE.md` (§10 covers the
UI redesign); the layout:
- `src/App.jsx` — route shell only; `src/router.jsx` — minimal
  History-API router (no routing dependency).
- `src/components/MapApp.jsx` — shared state + composition only.
- `src/lib/` — pure helpers: `geo.js` (haversine, coordinate conversion),
  `format.js` (display formatting), `categories.js` (data-only OSM category
  registry — add new categories here, one entry), `layers.js` (data-only
  layer-group registry), `geographicCache.js` (session cache for the OSM
  features of an area).
- `src/domain/` — pure modules: `pharmacyResults.js` (assembler for the
  pharmacy result list), `candidates.js` (the candidate finder),
  `analysis.js` (area statistics), `eligibility.js` (the EDA verdict).
- `src/services/` — one module per external provider: `placesService.js`
  (Google Places), `routingService.js` (Valhalla walking matrix),
  `osmService.js` (Overpass fetch/query — hits a **personal
  `overpass.nextgis.com` mirror**, not public `overpass-api.de`) and
  `osmNormalize.js` (raw OSM → uniform feature shape).
- `src/hooks/` — `useGeographicFeatures.js` (Overpass request state +
  cache) and `useCandidateRecommendation.js` (finder orchestration).
- `src/components/` — `PharmacySearch` (pipeline orchestrator),
  `SidePanel`, `SearchPanel`, `LayersControl`, `PharmacyResultsPanel`,
  `PharmacyCard`, `CandidatesPanel`, `GeographicAnalysis`,
  `VerdictChip`, plus `map/`. Google Maps rendering (`@vis.gl/...`)
  is used directly by map components only; `useMapsLibrary("places")` in
  `PharmacySearch`.
- `src/styles/` — `index.css` (tokens + base), `landing.css`,
  `app.css`.

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
