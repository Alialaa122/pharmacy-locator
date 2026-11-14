# Architecture — Pharmacy Locator

> **Status:** prototype (`prototype-v1` tag). Client-only application: no backend, no database,
> no server-side rendering. Steps 1–10 of the implementation plan are done and merged to main;
> step 11 (candidate recommendation — pure logic) is in flight on
> `feature/candidate-recommendation` (see `docs/PROGRESS.md`).
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
- **Recommender direction:** a deterministic (non-AI) recommender will be built on top of
  the evaluator as its own future feature; an LLM-assisted recommender is a longer-term
  goal that would consume the evaluator's structured output — explicit non-goal for now.
- **Candidate recommender (step 11, agreed):** auto-generated candidates (Option B), not
  user-picked points. Candidate sites = centroids of building polygons and midpoints of
  road ways from the *existing* Overpass features (no extra fetch). Every candidate must
  clear a **hard straight-line gate: ≥ 100 m from ALL pharmacies** (guarantees the EDA
  pass since walking ≥ straight-line). Sort margin-first, certify a top-10 budget with
  one Valhalla multi-source matrix, rank by walking separation descending, recommend
  the top 3. Step 11 ships the pure logic plus a **minimal verification UI**
  (button + panel + markers); a richer recommender UI is a follow-up.
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
11. Feature: candidate recommendation — pure logic (see §9 below).

No open decisions remain for the agreed scope. Coordinate/zoom values of
`lib/cities.js` are sanity-checked on first run. The recommender ships
with a minimal UI for verification (see §9); a rich recommender UI is
a deliberate follow-up feature.

## 9. Candidate Recommendation (step 11: logic only — UI deferred)

The recommender proposes **up to 3** spots where a new pharmacy would
comply with the EDA rule. It is deterministic — no randomness, no AI.
The pure logic (domain + service layers, fully tested) is the
deliverable; a **minimal UI** (trigger button, panel, markers) is
included in the same step for browser verification — see "UI"
below. A richer recommender UI (filters, per-band counts, export)
remains a follow-up feature.

**Source of truth for the rule:** the recommender re-derives eligibility
with the evaluator's primitives (`domain/eligibility.js`) against the full
pharmacy list, rather than reading the verdict state — the verdict
certifies the *clicked location*, while candidate ranking evaluates each
candidate against *every* competitor. Same rule, different inputs.

**Pipeline:**

```
features (existing Overpass fetch) + pharmacies (existing search results)
  1. buildCandidateSites(features)              (pure)
       building polygon → centroid; road LineString → midpoint
       label = OSM name tag, else "Building" / "Road";
       sites closer than 10 m are deduplicated (building wins ties)
  2. prefilterCandidates(sites, pharmacies)     (pure)
       HARD GATE: min STRAIGHT-LINE distance to ANY pharmacy >= 100 m
       (guarantees the EDA pass by walking >= straight-line)
       sort by that margin DOWN (most separated first), keep top 10
  3. routingService.getWalkingMatrix(candidates, pharmacies)
       one Valhalla POST (K sources x P targets);
       getWalkingRoutes() becomes a wrapper — its contract is unchanged
  4. rankCandidates(sites, matrix)               (pure)
       per candidate: min WALKING distance to any pharmacy = separation;
       band = classifySeparation() reused from eligibility.js;
       sort: walkingVerified desc, separation desc;
       walking-missing candidates keep their straight-line separation but
       never sort ahead of certified ones; take top 3
```

**Ranking semantics:** *more separated from competitors = better spot* —
consistent with the evaluator's bands, where margin is the "how good is
this spot" measure rather than proximity.

**Edge cases** (all pinned by step 11 tests):

| Case | Expected behavior |
|---|---|
| Fewer compliant candidates than 3 | Recommend what exists (0–3). |
| No pharmacies found | No recommendation — the compliance check is vacuous. |
| No building/road data in radius | No sites generated; no recommendation (not an error). |
| Valhalla failure | **Graceful degradation:** candidates are still ranked by straight-line separation and explicitly flagged `walkingVerified: false` — never presented as certified by walking distance. |
| All sites fail the 100 m gate | Zero candidates: no compliant spots in this radius. |

**UI (minimal, implemented in step 11 for verification):**
- `hooks/useCandidateRecommendation` — owns the orchestration
  (prefilter → Valhalla matrix → rank) and the request state.
  A recommendation is invalidated by reference comparison against the
  current pharmacy array, so any new search or "Clear Search"
  invalidates it automatically (derived state, no effect).
- `components/CandidatesPanel` — display-only: "Recommend locations"
  button (enabled after a search found ≥ 1 pharmacy), the 3 ranked
  cards (rank badge colored by band label, kind, band name if
  walking-verified, separation with its basis, nearest competitor),
  the empty "no compliant spots" message, and a clear button.
- `components/map/CandidateMarkers` — numbered `AdvancedMarker`s
  colored by band; all `@vis.gl` usage stays in `components/map/`.
- `App.jsx` wires the hook + panel + markers; no SDK objects cross
  into the panels (plain `recommendation` array down, callbacks up).

**Accepted limitation:** candidates are OSM-derived centroids/midpoints —
"this building / this stretch of road", best-effort, not a legal address
or door position.
