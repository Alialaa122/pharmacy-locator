import { CITIES } from "../lib/cities.js";
import PharmacySearch from "./PharmacySearch.jsx";

/**
 * Search controls: city selector, search radius, the chosen location
 * and the search button. Pure composition — state lives in MapApp.
 *
 * @param {{
 *   selectedCity: object,
 *   onCitySelect: (city: object) => void,
 *   searchRadius: number,
 *   setSearchRadius: (radius: number) => void,
 *   setPharmacies: (pharmacies: Array) => void,
 *   selectedLocation: { lat: number, lng: number } | null,
 *   setHasSearched: (value: boolean) => void,
 *   className?: string,
 * }} props
 */
function SearchPanel({
  selectedCity,
  onCitySelect,
  searchRadius,
  setSearchRadius,
  setPharmacies,
  selectedLocation,
  setHasSearched,
  className = "",
}) {
  return (
    <div className={`search-panel ${className}`.trim()}>
      <h2 className="search-panel-title">Search area</h2>

      <div className="field">
        <label htmlFor="search-city">City</label>

        <select
          id="search-city"
          value={selectedCity.id}
          onChange={(event) => {
            const city = CITIES.find(
              (candidate) => candidate.id === event.target.value
            );
            onCitySelect(city);
          }}
        >
          {CITIES.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="search-radius">Radius</label>

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
      </div>

      <div className="field">
        <span className="field-label">Location</span>

        {selectedLocation ? (
          <p className="location-readout">
            <span className="dot" aria-hidden="true" />
            {selectedLocation.lat.toFixed(5)},{" "}
            {selectedLocation.lng.toFixed(5)}
          </p>
        ) : (
          <p className="location-readout is-empty">
            Click the map to set a location
          </p>
        )}
      </div>

      <PharmacySearch
        setPharmacies={setPharmacies}
        selectedLocation={selectedLocation}
        searchRadius={searchRadius}
        setHasSearched={setHasSearched}
      />
    </div>
  );
}

export default SearchPanel;
