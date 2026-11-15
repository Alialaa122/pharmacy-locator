import { ROUTES, navigate } from "../router.jsx";

/**
 * Shared application header — brand + route navigation. Used by both
 * the landing page and the map application.
 *
 * @param {{ activePath: string }} props
 */
function AppHeader({ activePath }) {
  return (
    <header className="landing-header">
      <button
        type="button"
        className="brand"
        onClick={() => navigate(ROUTES.home)}
      >
        <span className="brand-mark" aria-hidden="true">
          💊
        </span>
        <span className="brand-name">Pharmacy Locator</span>
      </button>

      <nav className="landing-nav" aria-label="Main">
        <button
          type="button"
          className={`nav-link${activePath === ROUTES.home ? " active" : ""}`}
          aria-current={activePath === ROUTES.home ? "page" : undefined}
          onClick={() => navigate(ROUTES.home)}
        >
          Overview
        </button>
        <button
          type="button"
          className={`nav-link${activePath === ROUTES.app ? " active" : ""}`}
          aria-current={activePath === ROUTES.app ? "page" : undefined}
          onClick={() => navigate(ROUTES.app)}
        >
          Map app
        </button>
      </nav>
    </header>
  );
}

export default AppHeader;
