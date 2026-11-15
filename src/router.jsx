import { useEffect, useState } from "react";

/**
 * Minimal client-side router.
 *
 * The app has exactly two routes ("/" and "/app"), so a routing library
 * would be dead weight — this module is the whole implementation:
 * History API for navigation, `popstate` for back/forward support.
 *
 * Unknown paths fall back to the landing page.
 */

export const ROUTES = {
  home: "/",
  app: "/app",
};

function readPath() {
  return window.location.pathname === ROUTES.app ? ROUTES.app : ROUTES.home;
}

/**
 * Returns the current route ("/" or "/app") and re-renders on
 * navigation (including browser back/forward).
 *
 * @returns {string}
 */
export function useRoute() {
  const [path, setPath] = useState(readPath);

  useEffect(() => {
    function handleChange() {
      setPath(readPath());
    }

    window.addEventListener("popstate", handleChange);

    return () => window.removeEventListener("popstate", handleChange);
  }, []);

  return path;
}

/**
 * Navigates to a route without a page reload.
 *
 * @param {string} path - one of ROUTES
 */
export function navigate(path) {
  if (readPath() === path) {
    return;
  }

  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
