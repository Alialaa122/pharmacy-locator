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
| 11 | Candidate recommendation (logic only) | 🔧 In progress | — (feature/candidate-recommendation) | auto candidates (building centroids + road midpoints), 100 m straight-line hard gate, top-10 Valhalla certification, top-3 ranking; UI deferred |

**Tests: 77 passing** (8 files: osmNormalize, geo, format, pharmacyResults, categories, cities, eligibility, candidates)
**Lint: completely clean** (as of step 8)

Refactor steps 1–8 merged to main (`853bdd2`). Step 9 (city selector) merged
to main (`007eaef`). Step 10 (eligibility evaluator) merged to main (`6acbd22`).
Step 11 in progress on `feature/candidate-recommendation`:
- Docs spec — committed (`322f5c1`).
- `routingService.getWalkingMatrix` — committed (`9330fb5`);
  `getWalkingRoutes` is now a thin wrapper, its contract unchanged.
- `lib/geo.js` centroid/midpoint helpers — committed (`36d7c99`).
- `domain/candidates.js` + tests — committed (`ecaf1ec`).
  Every §9 edge case is pinned by tests (8 test files, 77 tests).
- **Next:** recommender UI (trigger + panel + markers) is a separate
  follow-up feature to be planned; logic is complete and tested.

## Verification log

- **Steps 3–4:** browser check confirmed by the user (search, walking
  distances, list, markers, InfoWindow all render correctly).
- **Steps 1–5:** `npm run lint`, `npm test`, `npm run build` green at each
  commit. Lint warnings remaining are pre-existing (tracked in step 8).
- **Step 10:** browser check confirmed by the user (verdict card renders the
  correct band with nearest competitor, walking separation, and
  straight-line distance; zero-result and unavailable-routing cases show the
  gray Unverified badge with a reason). Merged to main (`6acbd22`).

## Behavior changes so far (all agreed, documented in ARCHITECTURE.md §6/§8)

1. Search requires a selected map location (button disabled until click) —
   grid fallback deleted.
2. Consistent output for 0/1/many pharmacy results.
3. Valhalla failure degrades gracefully (direct distances + warning).
4. Cosmetic: distances ≥ 1000 m show thousands separators in the list too.

## Test-discovered facts worth remembering

- Way coordinates resolve from the embedded `geometry` array; node
  references are only used for relation members (pinned by test).
- The assembler's "no provider fields leak" test guards the domain boundary.
