/**
 * Geographic analysis panel — the statistics of the selected area.
 *
 * Display only: the numbers are derived from the loaded features and
 * stay the same whether or not the matching layer is drawn on the map.
 *
 * @param {{
 *   stats: { total: number, groups: Array<{ id: string, label: string, total: number, items: Array<{ key: string, label: string, count: number }>, other: number }> },
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
            These numbers come from the loaded area data. Enable a layer
            to see the features drawn on the map.
          </p>

          {stats.groups
            .filter((group) => group.total > 0)
            .map((group) => {
              const max = group.items[0]?.count ?? 1;

              return (
                <section className="analysis-group" key={group.id}>
                  <div className="analysis-group-head">
                    <h3 className="analysis-group-label">{group.label}</h3>
                    <span className="analysis-group-total">
                      {group.total}
                    </span>
                  </div>

                  <ul className="analysis-breakdown">
                    {group.items.map((item) => (
                      <li className="analysis-item" key={item.key}>
                        <span className="analysis-item-label">
                          {item.label}
                        </span>
                        <span className="analysis-item-count">
                          {item.count}
                        </span>
                        <span
                          className="analysis-item-bar"
                          style={{
                            width: `${Math.round((item.count / max) * 100)}%`,
                          }}
                          aria-hidden="true"
                        />
                      </li>
                    ))}

                    {group.other > 0 && (
                      <li className="analysis-item is-other">
                        <span className="analysis-item-label">Other</span>
                        <span className="analysis-item-count">
                          {group.other}
                        </span>
                      </li>
                    )}
                  </ul>
                </section>
              );
            })}

          {stats.total === 0 && (
            <p className="panel-empty">
              No geographic features were found in this area.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default GeographicAnalysis;
