import { useState, useEffect } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
  Circle
} from "@vis.gl/react-google-maps";
import PharmacyList from "./PharmacyList.jsx";
import GeographicAnalysis from "./GeographicAnalysis.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import CandidatesPanel from "./components/CandidatesPanel.jsx";
import OsmLayer from "./components/map/OsmLayer.jsx";
import CityMapMover from "./components/map/CityMapMover.jsx";
import CandidateMarkers from "./components/map/CandidateMarkers.jsx";
import { useGeographicFeatures } from "./hooks/useGeographicFeatures.js";
import { useCandidateRecommendation } from "./hooks/useCandidateRecommendation.js";
import { CATEGORIES } from "./lib/categories.js";
import { DEFAULT_CITY } from "./lib/cities.js";
import { formatDistance } from "./lib/format.js";





function MapClickHandler({ onLocationSelect }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("click", (event) => {
      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };

      onLocationSelect(location);
    });

    return () => listener.remove();
  }, [map, onLocationSelect]);

  return null;
}


function App() {
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [searchRadius, setSearchRadius] = useState(1000);
  const [hasSearched, setHasSearched] = useState(false);
  // { forRecommendation, index } — bound to the exact recommendation
  // array it came from, so a new search / new recommendation (a new
  // array reference) invalidates the selection automatically — no
  // stale InfoWindow, no effect (derived state, as in the hook).
  const [candidateSelection, setCandidateSelection] = useState(null);
  const selectedCandidateIndex =
    candidateSelection && candidateSelection.forRecommendation === recommendation
      ? candidateSelection.index
      : null;

  const {
    features: geographicFeatures,
    isLoading: isGeographicLoading,
    error: geographicError,
  } = useGeographicFeatures(selectedLocation, searchRadius);

  const {
    recommendation,
    isLoading: isRecommending,
    error: recommendError,
    recommend,
    clear: clearRecommendation,
  } = useCandidateRecommendation(geographicFeatures, pharmacies);

  const geographicStats = CATEGORIES.filter(
    (category) => category.showInStats
  ).map((category) => ({
    id: category.id,
    label: category.statsLabel,
    count: geographicFeatures.filter(
      (feature) => feature.category === category.id
    ).length,
  }));

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // A selected candidate is an index into the CURRENT recommendation.
  // A new search / clear invalidates the recommendation (reference
  // mismatch), so it also invalidates this selection — no stale window.
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

  return (
    
    <APIProvider apiKey={apiKey}>
      <SearchPanel
        selectedCity={selectedCity}
        onCitySelect={handleCitySelect}
        searchRadius={searchRadius}
        setSearchRadius={setSearchRadius}
        setPharmacies={setPharmacies}
        selectedLocation={selectedLocation}
        setHasSearched={setHasSearched}
      />

      <div className="map-layout">
      <div className="map-container">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_CITY.center}
          defaultZoom={DEFAULT_CITY.zoom}
          style={{ width: "100%", height: "600px" }}
        >
          <CityMapMover selectedCity={selectedCity} />
          {selectedPharmacy && !selectedCandidate && (
            <InfoWindow
              position={{
                lat: selectedPharmacy.lat,
                lng: selectedPharmacy.lng,
              }}
              onCloseClick={() => setSelectedPharmacy(null)}
            >
              <div>
                <h3>{selectedPharmacy.name}</h3>
                <p>{selectedPharmacy.address}</p>
                <p>
                  Direct distance:{" "}
                  {formatDistance(selectedPharmacy.directDistanceMeters)}
                </p>
                <small>
                  Measured in a straight line, not walking or driving distance.
                </small>            
                </div>
            </InfoWindow>
          )}
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          <OsmLayer features={geographicFeatures} />

          {selectedLocation && (
            <AdvancedMarker position={selectedLocation}>
              <div className="selected-location-marker">
                📍
              </div>
            </AdvancedMarker>
          )}
          {selectedLocation && (
              <Circle
                center={selectedLocation}
                radius={searchRadius}
                options={{
                  fillColor: "#16a34a",
                  fillOpacity: 0.15,
                  strokeColor: "#16a34a",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
          )}
          {pharmacies.map((pharmacy) => (
            <AdvancedMarker
              key={pharmacy.id}
              position={{ lat: pharmacy.lat, lng: pharmacy.lng }}
              title={pharmacy.name}
              onClick={() => setSelectedPharmacy(pharmacy)}
            />
        ))}
          {selectedCandidate && (
            <InfoWindow
              position={{
                lat: selectedCandidate.lat,
                lng: selectedCandidate.lng,
              }}
              onCloseClick={handleCloseCandidate}
            >
              <div className="candidate-window">
                <h3>
                  {recommendation.indexOf(selectedCandidate) + 1}.{" "}
                  {selectedCandidate.label}
                </h3>
                <p>
                  <strong>
                    {selectedCandidate.kind === "building"
                      ? "Building"
                      : "Road"}
                    {selectedCandidate.walkingVerified &&
                    selectedCandidate.band
                      ? ` · ${selectedCandidate.band.label}`
                      : selectedCandidate.walkingVerified
                        ? ""
                        : " · walking unverified"}
                  </strong>
                </p>
                <p>
                  {selectedCandidate.separationBasis === "walking"
                    ? "Separation (walking):"
                    : "Separation (straight-line):"}{" "}
                  {formatDistance(selectedCandidate.separationMeters)}
                </p>
                {selectedCandidate.walkingVerified &&
                  selectedCandidate.nearestCompetition && (
                    <p>
                      Nearest competitor:{" "}
                      {selectedCandidate.nearestCompetition.name}
                    </p>
                  )}
                <small>
                  {selectedCandidate.lat.toFixed(5)},{" "}
                  {selectedCandidate.lng.toFixed(5)}
                </small>
              </div>
            </InfoWindow>
          )}
          <CandidateMarkers
            recommendation={recommendation}
            selectedCandidateIndex={selectedCandidateIndex}
            onSelectCandidate={handleSelectCandidate}
          />
        </GoogleMap>
        </div>
        <PharmacyList
          pharmacies={pharmacies}
          onSelectPharmacy={setSelectedPharmacy}
          searchRadius={searchRadius}
          hasSearched={hasSearched}
          onClearSearch={handleClearSearch}
        />
        <CandidatesPanel
          canRecommend={
            hasSearched && pharmacies.length > 0 && !geographicError
          }
          recommendation={recommendation}
          isLoading={isRecommending}
          error={recommendError}
          selectedCandidateIndex={selectedCandidateIndex}
          onRecommend={recommend}
          onClear={handleClearRecommendation}
          onSelectCandidate={handleSelectCandidate}
        />
        <GeographicAnalysis
            stats={geographicStats}
            isLoading={isGeographicLoading}
            error={geographicError}
            hasLocation={Boolean(selectedLocation)}

        />
        </div>
    </APIProvider>
  );
}

export default App;
