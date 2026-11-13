# AGENTS.md

## Commands
- `npm run dev` — dev server on **port 3000** (hardcoded in vite.config.js, not 5173)
- `npm run lint` — oxlint (config in `.oxlintrc.json`; `react/rules-of-hooks` is an error)
- `npm run build` / `npm run preview`

No test suite exists. Don't invent `npm test`. `src/services/test-*.js` are standalone
Node scripts (top-level await) — run directly with `node src/services/test-overpass.js`.

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
