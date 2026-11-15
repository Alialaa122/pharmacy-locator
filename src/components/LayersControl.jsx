import { useState } from "react";
import { LAYER_GROUPS } from "../lib/layers.js";

/**
 * Floating map control that turns each geographic layer on or off.
 * Every group is independent: enabling one never enables another.
 *
 * Visibility is a VIEW concern only — the underlying data stays loaded,
 * so the geographic analysis keeps counting everything.
 *
 * @param {{
 *   visibility: Record<string, boolean>,
 *   onToggle: (groupId: string) => void,
 *   hasData: boolean,
 * }} props
 */
function LayersControl({ visibility, onToggle, hasData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`layers-control${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="layers-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="layers-panel"
      >
        <span aria-hidden="true">🗺️</span>
        <span>Layers</span>
      </button>

      {open && (
        <div className="layers-panel" id="layers-panel">
          <p className="layers-panel-title">Map layers</p>

          <ul className="layers-list">
            {LAYER_GROUPS.map((group) => (
              <li key={group.id}>
                <label className="layer-row">
                  <input
                    type="checkbox"
                    checked={Boolean(visibility[group.id])}
                    onChange={() => onToggle(group.id)}
                  />

                  <span className="layer-icon" aria-hidden="true">
                    {group.icon}
                  </span>

                  <span className="layer-text">
                    <span className="layer-label">{group.label}</span>
                    <span className="layer-description">
                      {group.description}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <p className="layers-note">
            {hasData
              ? "Layers change what is drawn. Statistics keep counting everything that was loaded."
              : "Select a location on the map to load the area's data."}
          </p>
        </div>
      )}
    </div>
  );
}

export default LayersControl;
