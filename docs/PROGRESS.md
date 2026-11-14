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
| 10 | Eligibility evaluator (EDA rule) | ✅ Done | `7881c7e` (feature/eligibility-evaluator) | `domain/eligibility.js` + `LocationVerdict`; walking-distance-based bands; Unverified semantics |

**Tests: 50 passing** (7 files: osmNormalize, geo, format, pharmacyResults, categories, cities, eligibility)
**Lint: completely clean** (as of step 8)

Refactor steps 1–8 merged to main (`853bdd2`). Step 9 (city selector) merged
to main (`007eaef`). Step 10 (eligibility evaluator) lives on
`feature/eligibility-evaluator` pending browser verification + merge.

## Verification log

- **Steps 3–4:** browser check confirmed by the user (search, walking
  distances, list, markers, InfoWindow all render correctly).
- **Steps 1–5:** `npm run lint`, `npm test`, `npm run build` green at each
  commit. Lint warnings remaining are pre-existing (tracked in step 8).

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
