
function GeographicAnalysis({
  stats,
  isLoading,
  error,
  hasLocation,
}) {
  return (
    <div className="geographic-analysis">
      <h2>Geographic Analysis</h2>

      {!hasLocation ? (
        <p>Select a location on the map to analyze the area.</p>
      ) : isLoading ? (
        <p>Loading geographic data...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <div>
            <h3>Buildings</h3>
            <p>{stats.buildings}</p>
          </div>

          <div>
            <h3>Roads</h3>
            <p>{stats.roads}</p>
          </div>

          <div>
            <h3>Schools</h3>
            <p>{stats.schools}</p>
          </div>

          <div>
            <h3>Hospitals</h3>
            <p>{stats.hospitals}</p>
          </div>

          <div>
            <h3>ATMs</h3>
            <p>{stats.atms}</p>
          </div>

          <div>
            <h3>Bus Stops</h3>
            <p>{stats.busStops}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default GeographicAnalysis;
