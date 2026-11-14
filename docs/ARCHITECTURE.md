# Architecture — Pharmacy Locator

> **Status:** prototype (`prototype-v1` tag). Client-only application: no backend, no database,
> no server-side rendering. Refactor progress: steps 1–8 of the implementation plan are done
> (see `docs/IMPLEMENTATION_PLAN.md` / `docs/PROGRESS.md`); step 9 (city selector + the
> `SearchPanel`/`MapCanvas`/`PharmacyMarkers` component split) is still pending, so the
> "Current Architecture" below describes the post-refactor state with those exceptions.

## 1. Current Architecture (as implemented after the refactor)

```
App.jsx (~170 lines) — shared state (pharmacies, selectedPharmacy,
  selectedLocation, searchRadius, hasSearched) + composition
  ├─ PharmacySearch (components/)    — orchestrates the search pipeline
  │     via placesService + routingService + domain/pharmacyResults
  ├─ MapClickHandler (inline in App) — useMap() click listener
  ├─ OsmLayer (components/map/)      — OSM overlays, dispatch by geometryType
  ├─ inline overlays                 — InfoWindow, location marker, Circle,
  │                                    pharmacy markers (move out in step 9)
  ├─ PharmacyList                    — display only, formatted via lib/format
  └─ GeographicAnalysis              — display only, registry-driven stats

lib/        geo.js (haversine, coordinate conversion) · format.js ·
            categories.js (data-only registry)
domain/     pharmacyResults.js (pure assembler)
services/   placesService · routingService · osmService · osmNormalize
hooks/      useGeographicFeatures (Overpass fetch + request state)
```

Google SDK objects never cross service boundaries; units are meters/seconds
with unit-suffixed field names; all display formatting lives in `lib/format.js`;
lint is clean and the test suite pins normalizer, assembler, and formatter
behavior.

## 2. Target Architecture (agreed — steps 1–8 implemented; step 9 pending)

```
UI components ──▶ hooks ──▶ domain (pure) ──▶ services ──▶ external APIs
        plain data in / callbacks out; one module per data provider
```

```
src/
├── lib/        geo.js · format.js · categories.js · cities.js
├── domain/     pharmacyResults.js            (pure result assembly)
├── services/   placesService · routingService · osmService · osmNormalize
├── hooks/      useGeographicFeatures · usePharmacySearch
├── components/ map/(MapCanvas · OsmLayer · PharmacyMarkers)
│               SearchPanel · PharmacyList · GeographicAnalysis
└── App.jsx     state + composition only
```

## 3. Responsibilities and Boundaries

**Two boundary rules for two kinds of external code:**

1. **Data providers get adapters.** Each external *data* source (Places, Valhalla, Overpass)
   is touched in exactly one service module, which translates responses into plain app data.
   Components never call `fetch` or SDK search methods and never receive SDK objects.
2. **The rendering library is a UI library.** `@vis.gl/react-google-maps` is used directly —
   but only inside `components/map/`. `App` and panels never import it; they pass plain props.
   `useMapsLibrary("places")` may be used directly in `SearchPanel` (a proposed wrapper hook
   was explicitly deferred as not worth it).

| Layer | Responsibility | Must not |
|---|---|---|
| UI components | render plain data, emit callbacks | fetch, import SDK data types, own business rules |
| `components/map/` | own all `@vis.gl` usage (overlays, `useMap`, listeners) | know about services or business logic |
| hooks | orchestrate flows, hold request state | contain pure calculations inline |
| domain (`lib/`, `domain/`) | pure functions: haversine, formatting, unit conversion, result assembly, category registry, city list | import React, call network, touch SDK |
| services | one module per provider; map to plain data with explicit units; contain provider fragility | leak provider shapes or units to callers |

**Unit convention (agreed):** distances in **meters**, durations in **seconds**, encoded in
field names (`directDistanceMeters`, `walkingDurationSeconds`). Formatting lives only in
`lib/format.js`.

**Category registry (`lib/categories.js`, data-only):** entries carry `id`, Overpass clause,
icon, `showInStats`. The query builder reads `overpass`; the normalizer stays *code* but
emits registry `id`s; rendering routes by `geometryType` (what a thing is vs. how it's drawn
are separate dimensions); stats iterate `showInStats`. Registry imports nothing — one-way
dependency direction.

## 4. Data Flows

**Pharmacy search pipeline (target):**

```
SearchPanel click
1. placesService.searchPharmacies({ center, radius })
     → Pharmacy[] { id, name, address, lat, lng }         (plain; no distances)
2. geo.calculateDistanceMeters(source, pharmacy)           (pure, local)
3. routingService.getWalkingRoutes(source, pharmacies)
     → [{ distanceMeters, durationSeconds } | null, ...]  (null = no route;
                                                           index matching kept INSIDE the service)
4. pharmacyResults.assemble(pharmacies, source, routes)    (pure: units, nulls-last sort)
5. usePharmacySearch → setPharmacies(final) → UI renders
```

The three services never import each other; the hook composes them. The pipeline runs
identically for 0, 1, or many results — output is always consistent.

**Geographic analysis (behavior preserved from current code, re-homed):**

```
map click → selectedLocation → useGeographicFeatures(location, radius)
  → osmService (Overpass query, POST) → osmNormalize → features state
  → OsmLayer (Polygon/Polyline/AdvancedMarker by geometryType)
  + GeographicAnalysis stats (counts by category, computed from features — derived, not stored)
```

## 5. City Selection and Map Behavior (implemented — step 9)

- `lib/cities.js` holds a static list; a dropdown selects. Agreed contents:

```js
{ id: "alexandria", name: "Alexandria", center: { lat: 31.2001, lng: 29.9187 }, zoom: 14 },
{ id: "cairo",      name: "Cairo",      center: { lat: 30.0444, lng: 31.2357 }, zoom: 14 },
{ id: "matrouh",    name: "Matrouh",    center: { lat: 31.3543, lng: 27.2373 }, zoom: 14 },
```

- `selectedCity` and `selectedLocation` are **separate** state slices. Selecting a city
  changes neither `selectedLocation` nor results.
- Selecting a city moves the map via **`map.setCenter(city.center)`** inside a map component
  using `useMap()` (agreed "Option A"; controlled map props rejected for now).
- The user **must click a location** before searching; the search button stays disabled
  until then. Selecting a city does **not** trigger an automatic search.
- **Grid Search is removed from the intended flow:** `generateGridCenters`, `delay`, and the
  multi-center loop are deleted; `placesService` performs a single search around the
  selected location. `searchRadius` continues to bound both the Places search and the
  Overpass query, and the `Circle` overlay.

## 6. Edge Cases (expected behavior)

| Case | Expected behavior (implemented as of step 4) |
|---|---|
| Zero pharmacies | `hasSearched=true`, empty-state message, no pharmacy markers, previous results cleared. |
| One pharmacy | Treated as a completely normal result: full pipeline runs — list entry, marker, InfoWindow, and walking distance requested (a 1-target matrix is valid). **Agreed behavior change** from the prototype's stale-list behavior. |
| Multiple | Sorted by walking distance ascending; missing-walking entries last. List click and marker click select the same item. |
| Missing walking route | Pharmacy keeps direct distance; `walkingDistanceMeters: null`; UI shows "Unavailable"; sorts last. |
| Routing API failure | **Graceful degradation:** results still shown with direct distances + a visible "walking distances unavailable" warning. The walking-distance feature fails; the system does not. |
| Places search failure | Fail fast: error message, results cleared (nothing to degrade to). |
| Overpass failure | Analysis panel shows error; map and pharmacy flow keep working. |
| Location verdict — normal | `LocationVerdict` certifies a band from the nearest pharmacy's **walking** distance: `<100` Not eligible (EDA rule), `≤150` Potential, `≤250` Strong, `>250` Very strong. |
| Location verdict — zero pharmacies | Gray **Unverified** with a reason; no distance is invented from absence of results. |
| Location verdict — routing failure | Gray **Unverified**: the EDA measure is walking distance, and it is never guessed from straight-line (walking ≥ straight-line, so straight-line < 100 m proves nothing). |

## 7. Testing Strategy (smallest useful)

Characterization tests pin current behavior **before** implementation changes. Runner:
**vitest** (agreed, one devDependency).

Test first, in priority order:

1. `normalizeOsmElements` — fixtures: `osm-data.json` + in-file mocks; counts by category,
   Polygon/LineString classification, multipolygon relations. Highest priority.
2. `calculateDistance` — anchors the meters unit before renaming.
3. `pharmacyResults.assemble` — written with the function; defines its contract
   (nulls-last, meters/seconds, plain data only).
4. `buildOverpassQuery` — string stability.

Not tested now: React components, network calls.

## 8. Agreed Decisions and Trade-offs

**Agreed:**
- Client-only architecture; no backend/database, state library, or TypeScript now (JSDoc
  typedefs instead). *Trade-off: explicit deferral, not avoidance.*
- One module per data provider; Google data mapped to plain objects at the boundary.
  *Trade-off: a mapping layer vs. SDK shapes leaking into UI.*
- `@vis.gl` rendering confined to `components/map/`; wrapping the map itself rejected as
  over-abstraction. `useMapsLibrary` used directly in `SearchPanel` (wrapper hook deferred).
- City selector replaces Grid Search; Option A (`setCenter`); search requires a location
  click; no auto-search on city selection. Cities: Alexandria, Cairo, Matrouh.
- Category registry is data-only with one-way dependencies. *Trade-off: one indirection vs.
  three-file changes per new category.*
- Explicit unit-suffixed fields in meters/seconds.
- Pure `pharmacyResults.assemble` module. *Trade-off: one more file vs. hidden logic in a hook.*
- Consistent search output regardless of result count (0/1/many).
- Graceful degradation for routing failures.
- **Eligibility evaluator** (`domain/eligibility.js`, `LocationVerdict`): the Egyptian Drug
  Authority rule — a new pharmacy must be ≥ 100 m from any existing pharmacy, measured as
  **walking distance** (user clarification; straight-line never substitutes for it). The
  150/250 m bands are advisory, adopted from the PharmaLoc notebook. Verdict is
  **Unverified** when no pharmacies are found or walking distances are unavailable. The
  verdict is derived from the result list (no new state, no API calls). Geometric fact
  the design relies on: walking ≥ straight-line, so straight-line ≥ 100 m guarantees the
  gate passes — useful later for cheap candidate prefiltering in the recommender.
- **Recommender direction:** a deterministic (non-AI) recommender will be built on top of
  the evaluator as its own future feature; an LLM-assisted recommender is a longer-term
  goal that would consume the evaluator's structured output — explicit non-goal for now.
- **Order: refactor first, new features after** (city selector is the first feature post-refactor).

**Implementation order (each step = one commit, following the AGENTS.md workflow loop):**

1. Create `docs/ARCHITECTURE.md` + update `AGENTS.md`.
2. Install vitest + characterization tests (`normalizeOsmElements`, haversine).
3. Pipeline step: `routingService` + extract `PharmacySearch` out of `App.jsx`.
4. `placesService` maps Google data at the boundary.
5. Units + `lib/format.js`.
6. `useGeographicFeatures` + `OsmLayer`.
7. Category registry.
8. Cleanup pass (dead code, debug logs, grid search deletion).
9. Feature: city selector (Alexandria / Cairo / Matrouh).

No open decisions remain. Coordinate/zoom values of `lib/cities.js` are sanity-checked on
first run.
