# Implementation Plan — Architecture Refactor

> Working branch: `architecture/refactor` (main stays untouched until merge).
> Every step follows the workflow loop in `AGENTS.md`:
> **Plan → Understand → Implement → Review → Test → Commit**.
> The architectural rules and contracts referenced here are defined in
> `docs/ARCHITECTURE.md`.

## Ground rules

- One roadmap step = one focused commit.
- Behavior changes must be agreed and documented in `ARCHITECTURE.md` §6/§8
  before (or with) the commit that introduces them.
- Characterization tests (step 2) must stay green throughout; a failing
  characterization test means an accidental behavior change.
- Verification per step: `npm run lint` + `npm test` + `npm run build`,
  plus a manual browser check for user-facing steps.

## Steps

### Step 1 — Documentation baseline ✅
Create `docs/ARCHITECTURE.md`; add the refactoring workflow to `AGENTS.md`.
Committed on main (`0a9ef48`) before branching.

### Step 2 — Test baseline ✅
Install vitest (devDependency) + characterization tests:
`normalizeOsmElements` (fixture `osm-data.json` + inline mocks, classification
rules, coordinate conventions) and haversine (meters unit anchor).
Nothing else changes in this step.

### Step 3 — Routing service + component extraction ✅
- New `src/services/routingService.js`: owns the Valhalla URL, request shape,
  and index matching; returns `[{ distanceMeters, durationSeconds } | null]`.
- Extract inline `PharmacySearch` out of `App.jsx` into
  `src/components/PharmacySearch.jsx` (logic preserved verbatim).
- km→meters conversion moves inside the service; `PharmacyList` display
  adapted to keep identical output.

### Step 4 — Places mapping at the boundary ✅
- New `src/services/placesService.js`: `searchPharmacies()` returns plain
  `{ id, name, address, lat, lng }`; Google SDK objects stop at this file.
- `calculateDistance` moves to `src/lib/geo.js` (distance math separate from
  the Places integration, per agreed data-ownership rules);
  `pharmacyService.js` is dissolved — grid fallback deleted with it.
- New `src/domain/pharmacyResults.js`: pure assembler
  (`assemblePharmacyResults`) with contract tests (nulls-last sort,
  meters/seconds, no provider-field leakage).
- Behavior changes (agreed, §6/§8): search requires a selected location;
  consistent output for 0/1/many results (no `places.length >= 2` gate);
  Valhalla failure degrades gracefully with a visible warning.

### Step 5 — Units + formatting ✅
- New `src/lib/format.js`: `formatDistance`, `formatDuration`, `formatRadius`
  — the only place doing display unit arithmetic.
- `convertCoordinates` ([lon, lat] → `{lat, lng}`) moves from `App.jsx` into
  `lib/geo.js`.
- Cosmetic unification: distances ≥ 1000 m show thousands separators in the
  list too.

### Step 6 — Geographic-analysis re-homing (next)
- New `src/hooks/useGeographicFeatures.js`: the Overpass fetch effect,
  features/loading/error state move out of `App.jsx`.
- New `src/components/map/OsmLayer.jsx`: Polygon/Polyline/point-marker
  rendering moves out of `App.jsx`; rendering dispatches by `geometryType`.
- No behavior change expected; `MapClickHandler` stays as-is for now.

### Step 7 — Category registry
- New `src/lib/categories.js` (data-only): `id`, Overpass clause, icon,
  `showInStats`.
- Overpass query builder, normalizer output, emoji map, and stats panel all
  read from it. Normalizer classification logic stays code, but emits
  registry `id`s.

### Step 8 — Cleanup pass
- Remove debug `console.log`/`console.table` calls (keep deliberate logs at
  service boundaries if useful).
- Remove unused state (`selectedAddress`), unused imports in the standalone
  `test-*.js` scripts, and any remaining dead code.
- Refresh `ARCHITECTURE.md` §6 "current implementation" notes to reflect the
  refactored state.

### Step 9 — Feature: city selector (first post-refactor feature)
- `src/lib/cities.js`: Alexandria, Cairo, Matrouh (agreed coordinates/zoom).
- Radius select + search button move into `SearchPanel`; city dropdown added.
- Selecting a city moves the map via `map.setCenter(city.center)` inside a
  map component (agreed Option A). `selectedCity` and `selectedLocation`
  remain separate; no auto-search on city selection.
- Sanity-check Matrouh's coordinates/zoom on first run.

### Merge
When steps 6–8 are verified, merge `architecture/refactor` into `main`
(PR preferred). Step 9 may also land on the branch or on main afterwards —
to be decided at merge time.
