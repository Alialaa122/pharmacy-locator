# Architecture — Pharmacy Locator

> **Status:** prototype (`prototype-v1` tag). Client-only application: no backend, no database,
> no server-side rendering. Steps 1–11 of the implementation plan are done
> (step 11 = the Geographic Candidate Finder, which replaced the earlier
> OSM-site recommender — see `docs/PROGRESS.md`).
> The "Current Architecture" below describes the post-refactor state.

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

## 2. Target Architecture (agreed — steps 1–10 implemented; step 11 in flight)

```
UI components ──▶ hooks ──▶ domain (pure) ──▶ services ──▶ external APIs
        plain data in / callbacks out; one module per data provider
```

```
src/
├── lib/        geo.js · format.js · categories.js · cities.js
├── domain/     pharmacyResults.js · candidates.js
│                     (pure result assembly · pure recommendation ranking)
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
- **Finder direction:** a deterministic (non-AI) location finder, no
  commercial factors at all (no demand, density, foot-traffic, price);
  results are "valid spots", not ranked "better/worse" spots; an
  LLM-assisted recommender remains a longer-term goal outside this
  prototype.
- **Candidate finder (step 11, re-planned and agreed):** candidates
  are geometric points on a deterministic grid inside the user-selected
  radius (5×5, spacing = radius/4). Two hard constraints, WALKING
  PRIORITY: (a) walking ≥ 100 m from every pharmacy is the
  authoritative validity gate — any unresolved route invalidates the
  candidate; (b) not on a road (road centerline within 15 m rejects;
  proximity is fine). Straight-line < 100 m is a rejection-only
  prefilter (sound by walking ≥ straight-line; it never accepts).
  Top 3 results are mutually ≥ 200 m apart (greedy scan order).
  Valhalla failure = distinct error (nothing certifiable); never a
  degraded straight-line fallback.
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
10. Feature: eligibility evaluator (`domain/eligibility.js`).
11. Feature: geographic candidate finder (see §9 below).

No open decisions remain for the agreed scope. Coordinate/zoom values of
`lib/cities.js` are sanity-checked on first run. The candidate finder
ships with a minimal UI for verification (see §9); a richer finder UI
(filters, per-constraint detail views, export) is a deliberate
follow-up feature.

## 9. Geographic Candidate Finder (step 11)

The finder proposes **up to 3** spots inside the user-selected radius
where a new pharmacy would satisfy the two agreed constraints. It is
deterministic — no randomness, no AI, and no commercial ranking
(no demand, density, foot-traffic, or price factors; the prototype
uses no such data, and the UI makes no "better/worse" claims between
the results).

**The two constraints — walking has absolute priority:**

1. **Walking ≥ 100 m from every existing pharmacy** — the
   *authoritative* rule. A candidate is valid only if Valhalla resolves
   a route to EVERY pharmacy and the minimum walking distance is ≥
   100 m. No other measurement can substitute for it. (The 100 m
   measure is a product assumption for this prototype, pending
   separate regulatory verification.)
2. **Not on a road** — a secondary hard filter: a candidate fails if
   any OSM road centerline is within **15 m**. Proximity beyond the
   tolerance is fine. Roads come from the *existing* Overpass fetch
   (no extra request); all `highway=*` LineStrings count.

**Pipeline** (cheapest-first — the evaluation order is an efficiency
detail; the walking rule always has the final say):

```
location + radius + features + pharmacies
  1. generateCandidatePoints(location, radius)        (pure)
        deterministic 5x5 square grid, spacing = radius/4,
        clipped to the circle (~25 points, radius-independent
        count); stable ids; constant point count keeps API
        volume stable
  2. filterOffRoad(points, roadFeatures)              (pure)
        reject if ANY road centerline < 15 m
        (lib/geo.distanceToPolylineMeters — planar
         point-to-segment, meters)
  3. filterFarEnough(points, pharmacies)              (pure)
        REJECTION-ONLY straight-line prefilter: reject if
        straight-line < 100 m to ANY pharmacy. Sound by
        walking >= straight-line: it can never wrongly reject,
        and it never ACCEPTS anyone — nothing passing here
        is certified yet
  4. budgetCandidates(survivors)                      (pure)
        cap at 20 by straight-line margin (descending) —
        pure request-budget bookkeeping, no ranking claim
  5. routingService.getWalkingMatrix(budgeted, pharmacies)
        reused unchanged (services layer caps each request at
        100 CELLS — sources x targets <= 100, proven live;
        chunks targets and merges the matrix). Worst case is
        20x20 = 400 cells -> 4 requests
  6. applyWalkingGate(budgeted, matrix, pharmacies)   (pure)
        THE WALKING RULE: every cell must resolve and the row's
        minimum must be >= 100 m. ANY missing route => the
        candidate is INVALID (an uncalculated distance is
        never assumed valid); a failed routing call (empty
        matrix) certifies nothing
  7. selectDistinctCandidates(valid, 3, 200)          (pure)
        greedy scan order: pick a candidate only >= 200 m from
        every already-picked one; stop at 3; return what
        exists (0-3), never pad
```

**Edge cases** (all pinned by tests):

| Case | Expected behavior |
|---|---|
| Fewer than 3 valid candidates | Return what exists (0-3). |
| No pharmacies found | Button disabled — the compliance check is vacuous (button requires >= 1 pharmacy, as before). |
| No road features in radius | Road filter passes everything — not an error. |
| Valhalla request fails (fetch throws) | **Distinct error state** ("candidates could not be verified") — never presented as an empty result. The walking rule is authoritative; nothing can be certified without it. |
| Individual route missing (null cell) | That candidate is rejected; others are unaffected. |
| All points fail the road check or the straight-line prefilter | Zero candidates: no valid spots in this radius (message shown). |
| New search / Clear Search | Existing reference-invalidation clears any previous result automatically. |

**UI (implemented):**
- `hooks/useCandidateRecommendation(location, radius, features,
  pharmacies)` — owns the orchestration (generate -> off-road ->
  straight-line prefilter -> budget -> Valhalla matrix -> walking
  gate -> distinct selection) and request state; keeps the
  reference-invalidation against the current pharmacy array and the
  request-id supersede guard from the recommender.
- `components/CandidatesPanel` — display-only: "Search for
  locations" button (enabled after a search found >= 1 pharmacy and
  the Overpass layer has loaded), up to 3 cards (neutral rank badge,
  the verified fact: walking distance to the nearest competitor and
  its name), the empty-state message, the routing-failure error, and
  a clear button.
- `components/map/CandidateMarkers` — numbered neutral
  `AdvancedMarker`s; all `@vis.gl` usage stays in `components/map/`.
- `App.jsx` wires hook + panel + markers + per-spot InfoWindow;
  plain candidate array down, callbacks up.

**Behavior changes from the earlier OSM-site recommender (all
agreed):** candidates are geometric grid points, not OSM-derived
centroids/midpoints (which could land ON roads — hence the new
road-exclusion constraint); the walking rule is now a hard VALIDITY
gate, not a band certification — advisory bands, margin-ranking,
`walkingVerified: false` fallbacks, and OSM-site labeling are all
removed; routing failure now surfaces as a distinct error instead
of a degraded straight-line result. `domain/eligibility.js`
(clicked-location verdict) is untouched and independent.

**Accepted limitations:** candidates are geometric points, best-
effort "this spot", not a legal address or door position; the
15 m road tolerance is a prototype constant (a `highway` class
filter is a follow-up if it over-rejects); the 100 m walking rule
is a product assumption, pending regulatory verification.

