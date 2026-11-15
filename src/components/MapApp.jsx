import { useState } from "react";
import { APIProvider, Map as GoogleMap } from "@vis.gl/react-google-maps";
import AppHeader from "./AppHeader.jsx";
import SidePanel from "./SidePanel.jsx";
import PharmacyResultsPanel from "./PharmacyResultsPanel.jsx";
import VerdictChip from "./VerdictChip.jsx";
import GeographicAnalysis from "../GeographicAnalysis.jsx";
import SearchPanel from "./SearchPanel.jsx";
import CandidatesPanel from "./CandidatesPanel.jsx";
import LayersControl from "./LayersControl.jsx";
import OsmLayer from "./map/OsmLayer.jsx";
import CityMapMover from "./map/CityMapMover.jsx";
import MapClickHandler from "./map/MapClickHandler.jsx";
import SearchCircle from "./map/SearchCircle.jsx";
import LocationMarker from "./map/LocationMarker.jsx";
import PharmacyMarkers from "./map/PharmacyMarkers.jsx";
import PharmacyInfoWindow from "./map/PharmacyInfoWindow.jsx";
import CandidateInfoWindow from "./map/CandidateInfoWindow.jsx";
import CandidateMarkers from "./map/CandidateMarkers.jsx";
import { useGeographicFeatures } from "../hooks/useGeographicFeatures.js";
import { useCandidateRecommendation } from "../hooks/useCandidateRecommendation.js";
import { DEFAULT_CITY } from "../lib/cities.js";
import {
  DEFAULT_LAYER_VISIBILITY,
  visibleCategories,
} from "../lib/layers.js";
import { computeAnalysisStats } from "../domain/analysis.js";
import { ROUTES } from "../router.jsx";

const TABS = {
  results: "results",
  analysis: "analysis",
  candidates: "candidates",
};

/**
 * The map application: owns the shared application state (pharmacies,
 * selected location, radius, candidate selection) and composes the
 * panels and the map.
 *
 * @param {{ apiKey: string }} props
 */
function MapApp({ apiKey }) {
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [searchRadius, setSearchRadius] = useState(1000);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.results);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState(
    DEFAULT_LAYER_VISIBILITY
  );
  // { forRecommendation, index } — bound to the exact recommendation
  // array it came from, so a new search / new recommendation (a new
  // array reference) invalidates the selection automatically — no
  // stale InfoWindow, no effect (derived state, as in the hook).
  const [candidateSelection, setCandidateSelection] = useState(null);

  const {
    features: geographicFeatures,
    isLoading: isGeographicLoading,
    error: geographicError,
  } = useGeographicFeatures(selectedLocation, searchRadius);

  const {
    recommendation,
    isLoading: isFinding,
    error: findError,
    find,
    clear: clearRecommendation,
  } = useCandidateRecommendation(
    selectedLocation,
    searchRadius,
    geographicFeatures,
    pharmacies
  );

  const geographicStats = computeAnalysisStats(geographicFeatures);

  // A selected candidate is an index into the CURRENT recommendation.
  // A new search / clear invalidates the recommendation (reference
  // mismatch), so it also invalidates this selection — no stale window.
  // Derived AFTER the hooks: `recommendation` is declared by the hook
  // call above, so this must not run before it (TDZ).
  const selectedCandidateIndex =
    candidateSelection && candidateSelection.forRecommendation === recommendation
      ? candidateSelection.index
      : null;

  const selectedCandidate =
    recommendation && selectedCandidateIndex !== null
      ? recommendation[selectedCandidateIndex]
      : null;

  function handleClearSearch() {
    setPharmacies([]);
    setSelectedPharmacy(null);
    setHasSearched(false);
    setCandidateSelection(null);
    clearRecommendation();
  }

  function handleSelectCandidate(index) {
    setSelectedPharmacy(null); // one info-window at a time
    setCandidateSelection({ forRecommendation: recommendation, index });
  }

  function handleCloseCandidate() {
    setCandidateSelection(null);
  }

  function handleClearRecommendation() {
    setCandidateSelection(null);
    clearRecommendation();
  }

  function handleLocationSelect(location) {
    setSelectedLocation(location);
  }

  function handleCitySelect(city) {
    setSelectedCity(city);
  }

  function handleToggleLayer(groupId) {
    setLayerVisibility((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  // Which OSM categories the map should draw. Derived from the layer
  // visibility only — the features themselves stay loaded, so hiding a
  // layer never triggers a new request.
  const drawnCategories = visibleCategories(layerVisibility);

  const canRecommend =
    hasSearched &&
    pharmacies.length > 0 &&
    !geographicError &&
    !isGeographicLoading;

  const panelTabs = [
    {
      id: TABS.results,
      label: "Results",
      badge: hasSearched ? pharmacies.length : null,
      content: (
        <PharmacyResultsPanel
          pharmacies={pharmacies}
          selectedPharmacyId={selectedPharmacy?.id ?? null}
          onSelectPharmacy={setSelectedPharmacy}
          searchRadius={searchRadius}
          hasSearched={hasSearched}
          onClearSearch={handleClearSearch}
        />
      ),
    },
    {
      id: TABS.analysis,
      label: "Analysis",
      badge: geographicError ? "!" : null,
      content: (
        <GeographicAnalysis
          stats={geographicStats}
          isLoading={isGeographicLoading}
          error={geographicError}
          hasLocation={Boolean(selectedLocation)}
        />
      ),
    },
    {
      id: TABS.candidates,
      label: "Candidates",
      badge: recommendation ? recommendation.length : null,
      content: (
        <CandidatesPanel
          canRecommend={canRecommend}
          recommendation={recommendation}
          isLoading={isFinding}
          error={findError}
          selectedCandidateIndex={selectedCandidateIndex}
          onFind={find}
          onClear={handleClearRecommendation}
          onSelectCandidate={handleSelectCandidate}
        />
      ),
    },
  ];

  return (
    <APIProvider apiKey={apiKey}>
      <div className="map-app">
        <AppHeader activePath={ROUTES.app} />

        <div className={`app-shell${panelCollapsed ? " is-collapsed" : ""}`}>
          <SidePanel
            tabs={panelTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            collapsed={panelCollapsed}
            onToggleCollapsed={() => setPanelCollapsed((value) => !value)}
          />

          <main className="map-stage">
            <div className="map-container">
              <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={DEFAULT_CITY.center}
                defaultZoom={DEFAULT_CITY.zoom}
                style={{ width: "100%", height: "100%" }}
              >
                <CityMapMover selectedCity={selectedCity} />

                {selectedPharmacy && !selectedCandidate && (
                  <PharmacyInfoWindow
                    pharmacy={selectedPharmacy}
                    onClose={() => setSelectedPharmacy(null)}
                  />
                )}

                <MapClickHandler onLocationSelect={handleLocationSelect} />
                <OsmLayer
                  features={geographicFeatures}
                  visibleCategories={drawnCategories}
                />

                {selectedLocation && (
                  <LocationMarker position={selectedLocation} />
                )}
                {selectedLocation && (
                  <SearchCircle
                    center={selectedLocation}
                    radius={searchRadius}
                  />
                )}

                <PharmacyMarkers
                  pharmacies={pharmacies}
                  selectedPharmacyId={selectedPharmacy?.id ?? null}
                  onSelectPharmacy={setSelectedPharmacy}
                  visible={layerVisibility.pharmacies}
                />

                {selectedCandidate && (
                  <CandidateInfoWindow
                    candidate={selectedCandidate}
                    rank={recommendation.indexOf(selectedCandidate) + 1}
                    onClose={handleCloseCandidate}
                  />
                )}

                <CandidateMarkers
                  recommendation={recommendation}
                  selectedCandidateIndex={selectedCandidateIndex}
                  onSelectCandidate={handleSelectCandidate}
                />
              </GoogleMap>
            </div>

            <SearchPanel
              className="search-overlay"
              selectedCity={selectedCity}
              onCitySelect={handleCitySelect}
              searchRadius={searchRadius}
              setSearchRadius={setSearchRadius}
              setPharmacies={setPharmacies}
              selectedLocation={selectedLocation}
              setHasSearched={setHasSearched}
            />

            <LayersControl
              visibility={layerVisibility}
              onToggle={handleToggleLayer}
              hasData={geographicFeatures.length > 0}
            />

            <VerdictChip
              pharmacies={pharmacies}
              hasSearched={hasSearched}
            />
          </main>
        </div>
      </div>
    </APIProvider>
  );
}

export default MapApp;
