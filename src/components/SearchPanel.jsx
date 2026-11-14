import { CITIES } from "../lib/cities.js";
import PharmacySearch from "./PharmacySearch.jsx";

/**
 * Search controls: city selector, search radius, and the search button.
 * Pure composition — state lives in App.
 */
function SearchPanel({
  selectedCity,
  onCitySelect,
  searchRadius,
  setSearchRadius,
  setPharmacies,
  selectedLocation,
  setHasSearched,
}) {
  return (
    <div className="search-panel">
      <label htmlFor="search-city">City:</label>

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
