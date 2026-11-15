/**
 * The application side panel: one visible tab at a time so the search
 * results, the geographic analysis and the candidate finder never
 * compete for attention. The whole panel can be collapsed to give the
 * map the full width.
 *
 * @param {{
 *   tabs: Array<{ id: string, label: string, badge?: number | string | null, content: React.ReactNode }>,
 *   activeTab: string,
 *   onTabChange: (id: string) => void,
 *   collapsed: boolean,
 *   onToggleCollapsed: () => void,
 * }} props
 */
function SidePanel({
  tabs,
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapsed,
}) {
  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <aside className={`side-panel${collapsed ? " is-collapsed" : ""}`}>
      <div className="panel-header">
        {!collapsed && (
          <div className="panel-tabs" role="tablist" aria-label="Panels">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={tab.id === activeTab}
                aria-controls={`panel-${tab.id}`}
                className={`panel-tab${
                  tab.id === activeTab ? " is-active" : ""
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}

                {tab.badge !== null &&
                  tab.badge !== undefined &&
                  tab.badge !== "" && (
                    <span className="tab-badge">{tab.badge}</span>
                  )}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="panel-collapse"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          title={collapsed ? "Show panel" : "Focus the map"}
        >
          {collapsed ? "›" : "‹"}
          <span className="visually-hidden">
            {collapsed ? "Show side panel" : "Collapse side panel"}
          </span>
        </button>
      </div>

      {!collapsed && (
        <div
          className="panel-body"
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeContent}
        </div>
      )}
    </aside>
  );
}

export default SidePanel;
