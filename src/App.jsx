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
import PharmacySearch from "./components/PharmacySearch.jsx";
import OsmLayer from "./components/map/OsmLayer.jsx";
import { useGeographicFeatures } from "./hooks/useGeographicFeatures.js";
import { CATEGORIES } from "./lib/categories.js";
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
  const [searchRadius, setSearchRadius] = useState(1000);
  const [hasSearched, setHasSearched] = useState(false);

  const {
    features: geographicFeatures,
    isLoading: isGeographicLoading,
    error: geographicError,
  } = useGeographicFeatures(selectedLocation, searchRadius);

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

  function handleClearSearch() {
    setPharmacies([]);
    setSelectedPharmacy(null);
    setHasSearched(false);
  }

  function handleLocationSelect(location) {
    setSelectedLocation(location);
  }

  return (
    
    <APIProvider apiKey={apiKey}>
      <label htmlFor="search-radius">Search Radius:</label>

      <select
          id="search-radius"
          value={searchRadius}
          onChange={(event) => setSearchRadius(Number(event.target.value))}
      >
          <option value={500}>500 m</option>
          <option value={1000}>1 km</option>
          <option value={2000}>2 km</option>
          <option value={3000}>3 km</option>
      </select>

      <div className="map-layout">
      <div className="map-container">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: 31.2001, lng: 29.9187 }}
          defaultZoom={14}
          style={{ width: "100%", height: "600px" }}
        >
          {selectedPharmacy && (
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
          <PharmacySearch setPharmacies={setPharmacies}
                          selectedLocation={selectedLocation}
                          searchRadius={searchRadius}
                          setHasSearched={setHasSearched}

          />
          {pharmacies.map((pharmacy) => (
            <AdvancedMarker
              key={pharmacy.id}
              position={{ lat: pharmacy.lat, lng: pharmacy.lng }}
              title={pharmacy.name}
              onClick={() => setSelectedPharmacy(pharmacy)}
            />
        ))}
        </GoogleMap>
        </div>
        <PharmacyList
          pharmacies={pharmacies}
          onSelectPharmacy={setSelectedPharmacy}
          searchRadius={searchRadius}
          hasSearched={hasSearched}
          onClearSearch={handleClearSearch}
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
