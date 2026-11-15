import { useRoute } from "./router.jsx";
import LandingPage from "./components/LandingPage.jsx";
import MapApp from "./components/MapApp.jsx";

/**
 * Application shell — routes between the landing page ("/") and the
 * map application ("/app"). The Google Maps API key is read here (the
 * only place that touches `import.meta.env`) and handed to the map
 * application, so the landing page never needs it.
 */
function App() {
  const path = useRoute();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return path === "/app" ? (
    <MapApp apiKey={apiKey} />
  ) : (
    <LandingPage />
  );
}

export default App;
