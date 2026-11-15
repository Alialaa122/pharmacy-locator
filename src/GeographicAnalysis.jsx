/**
 * Geographic analysis panel — counts of the OSM features found in the
 * selected radius. Display only: the numbers are derived from the
 * loaded features and are independent of what the map currently
 * draws.
 *
 * @param {{
 *   stats: Array<{ id: string, label: string, count: number }>,
 *   isLoading: boolean,
 *   error: string,
 *   hasLocation: boolean,
 * }} props
 */
function GeographicAnalysis({ stats, isLoading, error, hasLocation }) {
  return (
    <div className="geographic-analysis">
      <h2>Geographic Analysis</h2>

      {!hasLocation ? (
        <p className="panel-empty">
          Select a location on the map to analyze the area.
        </p>
      ) : isLoading ? (
        <p className="panel-empty">Loading geographic data...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <p className="analysis-hint">
            Statistics come from the loaded map data — enable a layer to
            see the features drawn on the map.
          </p>

          {stats.map((stat) => (
            <div className="stat-row" key={stat.id}>
              <span className="stat-label">{stat.label}</span>
              <span className="stat-count">{stat.count}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default GeographicAnalysis;
