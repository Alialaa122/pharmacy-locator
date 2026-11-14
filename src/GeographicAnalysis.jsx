
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
        stats.map((stat) => (
          <div key={stat.id}>
            <h3>{stat.label}</h3>
            <p>{stat.count}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default GeographicAnalysis;
