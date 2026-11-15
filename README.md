# Pharmacy Locator

A map-based prototype for finding nearby pharmacies, analysing a selected
area, and identifying spots where a new pharmacy could geometrically fit.

Everything runs in the browser — there is no backend, no database and no
server-side rendering.

---

## What it does

The app has two screens:

| Route | Screen |
|---|---|
| `/` | Landing page — what the product does, in one screen |
| `/app` | The map application |

The map application is built around three capabilities:

**1. Pharmacy Discovery** — pick a city, click a location, choose a radius
(500 m – 3 km) and search. Every pharmacy comes back with its walking
distance, walking time and straight-line distance from your chosen point,
sorted by walking distance. The nearest pharmacy is badged, and a verdict
chip over the map tells you how the location scores against the EDA rule.

**2. Geographic Analysis** — the statistics of the area inside the radius:
buildings (broken down by type), roads (by class), land use, facilities and
points of interest. The numbers are computed from the loaded data, so the
panel stays useful even when every layer on the map is switched off.

**3. Candidate Location Recommender** — checks points inside the radius
against two hard rules and returns up to three valid spots:

- at least **100 m walking distance** from every existing pharmacy
  (measured with the routing service, never estimated);
- **not on a road** (a road centerline within 15 m rejects the point —
  being *next* to a road is fine).

The panel reports exactly what happened: how many points were generated, how
many passed, how many were rejected and why, and how many were never
checked. Rejected spots can be shown on the map.

> The 100 m rule is a **product assumption** used for demonstration and is
> pending separate regulatory verification.

---

## Setup

### Requirements

- **Node.js 20+** (developed on Node 24) and npm
- A **Google Maps API key** with the **Maps JavaScript API** and the
  **Places API (New)** enabled

### Install

```bash
npm install
```

### Configure the API key

Create a `.env` file in the project root:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

`.env` is gitignored — never commit the key, and never hardcode it in the
source. Vite only exposes variables prefixed with `VITE_` to the client, and
the key is read in `src/App.jsx`. Without a valid key the map will not render.

### Run it

```bash
npm run dev       # dev server on http://localhost:3000
```

Open http://localhost:3000 for the landing page and
http://localhost:3000/app for the map application.

### Other commands

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
npm run test      # vitest
```

---

## How it works

### Data sources

| Source | Used for | Module |
|---|---|---|
| **Google Places** | the pharmacy search | `src/services/placesService.js` |
| **Valhalla** | walking distance/time matrices | `src/services/routingService.js` |
| **OpenStreetMap (Overpass)** | buildings, roads, land use, facilities, POIs | `src/services/osmService.js` |

The Overpass queries go to a **personal `overpass.nextgis.com` mirror**, not
the public `overpass-api.de` endpoint.

### The flow

```
click the map
  → Overpass loads the area (once per centre + radius, cached for the session)
  → search → Places returns the pharmacies
           → Valhalla returns the walking routes
           → domain/pharmacyResults assembles and sorts the results
  → "Find valid locations" → domain/candidates checks the candidate points
           → Valhalla certifies the 100 m walking rule
```

### Layers and statistics are independent

The map starts **clean**: no geographic feature is drawn until you enable its
layer. Layers are grouped — Pharmacies, Areas, Transportation, Buildings,
Facilities and Points of interest — and each one toggles on its own.

Turning a layer off only stops the drawing. The data stays loaded, so:

- switching layers never triggers another request;
- the analysis panel keeps counting the hidden features.

A candidate needs the road data to run its road check, so the data is loaded
as soon as a location is chosen, regardless of what is visible.

### Architecture

```
UI components ──▶ hooks ──▶ domain (pure) ──▶ services ──▶ external APIs
        plain data in / callbacks out; one module per data provider
```

- `src/lib/` — pure helpers: `geo.js`, `format.js` (all display formatting
  lives here), `categories.js` and `layers.js` (data-only registries),
  `geographicCache.js` (session cache), `cities.js`.
- `src/domain/` — pure logic: `pharmacyResults.js`, `candidates.js`,
  `analysis.js`, `eligibility.js`.
- `src/services/` — one module per external provider. They translate
  responses into plain data; SDK objects never cross the boundary.
- `src/hooks/` — request orchestration: `useGeographicFeatures`,
  `useCandidateRecommendation`.
- `src/components/` — the UI. All `@vis.gl` usage lives in
  `src/components/map/`; panels never import the Maps SDK.
- `src/styles/` — `index.css` (design tokens + base), `landing.css`,
  `app.css`.

Distances are metres and durations are seconds everywhere, with unit-suffixed
field names. The full architecture, including every deliberate behaviour
change, is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Project layout

```
src/
├── App.jsx              route shell ("/" or "/app")
├── router.jsx           minimal History-API router
├── components/
│   ├── LandingPage.jsx  the landing page
│   ├── MapApp.jsx       owns the shared state, composes everything
│   ├── SidePanel.jsx    the Results / Analysis / Candidates tabs
│   ├── SearchPanel.jsx  city, radius, location, search
│   ├── LayersControl.jsx  the layer switches
│   ├── PharmacyResultsPanel.jsx · PharmacyCard.jsx
│   ├── CandidatesPanel.jsx
│   ├── VerdictChip.jsx · LocationVerdict.jsx
│   └── map/             every @vis.gl component lives here
├── domain/              pharmacyResults · candidates · analysis · eligibility
├── hooks/               useGeographicFeatures · useCandidateRecommendation
├── lib/                 geo · format · categories · layers · geographicCache · cities
├── services/            placesService · routingService · osmService · osmNormalize
└── styles/              index · landing · app
```

---

## Tests

```bash
npm run test
```

The suite pins the behaviour that matters: the OSM normalizer, the result
assembler, the category and layer registries, the area statistics, the
candidate finder (including the rejection reasons), the session cache and the
formatters.

---

## Known limitations

- **The 100 m walking-distance rule is a prototype assumption** and still
  requires separate regulatory verification.
- Candidate spots are **geometric points** — a plausible "this spot", not a
  legal address or a door position.
- The 15 m road tolerance is a prototype constant; every `highway=*` way
  counts as a road.
- **Administrative boundaries are not loaded** — they would need a new
  Overpass selector and are a separate decision.
- The candidate finder is deterministic (a fixed grid, no randomness) and
  introduces **no commercial factors** — no population, foot-traffic, rent
  or demand data. The results are "valid spots", never a ranking.
- Some places come back from Places without a display name; the card then
  shows the address instead. Nothing is ever invented.
