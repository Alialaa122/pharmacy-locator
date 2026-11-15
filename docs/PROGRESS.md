# Progress — Architecture Refactor

> Branch: `architecture/refactor` · Plan: `docs/IMPLEMENTATION_PLAN.md` ·
> Architecture: `docs/ARCHITECTURE.md`

## Status

| # | Step | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 1 | Documentation baseline | ✅ Done | `0a9ef48` (main) | `ARCHITECTURE.md` + workflow in `AGENTS.md` |
| 2 | Test baseline (vitest + characterization) | ✅ Done | `ca2b4ee`, `31032ff` | 15 tests; pinned normalizer + haversine behavior |
| 3 | Routing service + component extraction | ✅ Done | `ce93359` | Valhalla isolated; `App.jsx` 439 → 278 lines |
| 4 | Places mapping at the boundary | ✅ Done | `e1d2bf2` | Plain pharmacy data; assembler + tests; 3 agreed behavior changes |
| 5 | Units + formatting | ✅ Done | `73064c9` | `lib/format.js`; `convertCoordinates` → `lib/geo.js` |
| 6 | Geographic-analysis re-homing | ✅ Done | `f62f4a6` | `useGeographicFeatures` hook + `OsmLayer`; `App.jsx` ~278 → 196 lines |
| 7 | Category registry | ✅ Done | `b7b2a95` | `lib/categories.js`; query/classification/icons/stats registry-driven |
| 8 | Cleanup pass | ✅ Done | `ed9cbde`, `34f72be` | service split (osmService/osmNormalize), logs + dead code removed, lint fully clean |
| 9 | City selector feature | ✅ Done | `77bc1de` (feature/city-selector) | Alexandria/Cairo/Matrouh; CityMapMover; SearchPanel split |
| 10 | Eligibility evaluator (EDA rule) | ✅ Done | `7881c7e` merged `6acbd22` | `domain/eligibility.js` + `LocationVerdict`; walking-distance-based bands; Unverified semantics |
| 11 | Geographic candidate finder | ✅ Done | `cab5828` merged `298c264` | grid point generation, 15 m road exclusion, WALKING ≥ 100 m validity gate, top-3 mutually distinct candidates; replaced the earlier OSM-site recommender |

**Tests: 85 passing** (8 files: osmNormalize, geo, format, pharmacyResults, categories, cities, eligibility, candidates)
**Lint: completely clean** (as of step 8)

Refactor steps 1–8 merged to main (`853bdd2`). Step 9 (city selector) merged
to main (`007eaef`). Step 10 (eligibility evaluator) merged to main (`6acbd22`).
Step 11 (geographic candidate finder) merged to main (`298c264`);
planned, approved, implemented on `feature/candidate-recommendation`:
- Planning: the feature was re-planned as the Geographic Candidate Finder
  (geometric sampling, not OSM-derived sites); all open questions approved
  (grid spacing radius/4, 15 m road tolerance, strict walking-gate
  rejection, 200 m mutual spacing, scan-order selection).
- Pre-task — `cb5315a`: Valhalla cap corrected to 100 CELLS
  (sources × targets, probed live); recommend button disabled while
  Overpass loads.
- `lib/geo.js distanceToPolylineMeters` — committed (`e1b636e`):
  planar point-to-segment, meters, cos(lat) longitude scaling.
- `domain/candidates.js` rewrite — committed (`cab5828`):
  `generateCandidatePoints` (5×5 grid, radius/4 spacing), `filterOffRoad`,
  `filterFarEnough` (rejection-only), `budgetCandidates`,
  `applyWalkingGate` (any missing route ⇒ invalid),
  `selectDistinctCandidates`; old OSM-site pipeline + centroid/midpoint
  helpers removed.
- UI + hook — committed (`5080d99`):
  `useCandidateRecommendation(location, radius, features, pharmacies)` —
  distinct routing-failure error (nothing can be certified without the
  walking rule); panel/markers de-ranked (no band colors, verified facts
  only).
- Docs — `docs/ARCHITECTURE.md` §9 rewritten to the finder spec.

## Verification log

- **Steps 3–4:** browser check confirmed by the user (search, walking
  distances, list, markers, InfoWindow all render correctly).
- **Steps 1–5:** `npm run lint`, `npm test`, `npm run build` green at each
  commit. Lint warnings remaining are pre-existing (tracked in step 8).
- **Step 10:** browser check confirmed by the user (verdict card renders the
  correct band with nearest competitor, walking separation, and
  straight-line distance; zero-result and unavailable-routing cases show the
  gray Unverified badge with a reason). Merged to main (`6acbd22`).
- **Step 11:** browser check by the user: search → "Search for locations"
  → up to 3 mutually distinct valid spots, none on roads, each ≥ 100 m
  walking from every pharmacy; candidate click + InfoWindow work after a
  TDZ fix — `selectedCandidateIndex` was derived BEFORE the hook declared
  `recommendation` (a latent bug from the clickable-spots commit); fixed
  in `1c85b6f` and re-verified by the user. Merged to main (`298c264`).

## Behavior changes so far (all agreed, documented in ARCHITECTURE.md §6/§8)

1. Search requires a selected map location (button disabled until click) —
   grid fallback deleted.
2. Consistent output for 0/1/many pharmacy results.
3. Valhalla failure degrades gracefully (direct distances + warning).
4. Cosmetic: distances ≥ 1000 m show thousands separators in the list too.
5. Candidate finder (step 11 replan, agreed): candidates are geometric
   grid points, validated by the walking-distance rule (authoritative
   gate, strict on missing routes) + road exclusion; band-based ranking
   and OSM-site recommendations removed; routing failure shows a
   distinct "not verified" error instead of degraded results.

## Test-discovered facts worth remembering

- Way coordinates resolve from the embedded `geometry` array; node
  references are only used for relation members (pinned by test).
- The assembler's "no provider fields leak" test guards the domain boundary.
- Deriving state that depends on a hook's return value in the same
  function body but BEFORE the hook call throws a TDZ ReferenceError only
  when the derivation reads it — it slips past lint, tests and
  `npm run build`. Derived values must come after all hook calls
  (`1c85b6f` was found by browser verification, not by any script).
