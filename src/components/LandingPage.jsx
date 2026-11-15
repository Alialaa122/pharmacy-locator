import AppHeader from "./AppHeader.jsx";
import { ROUTES, navigate } from "../router.jsx";

const STEPS = [
  {
    number: "01",
    title: "Pick a location",
    text: "Choose a city, then click anywhere on the map to set the centre of your search.",
  },
  {
    number: "02",
    title: "Set the radius",
    text: "Pick a search radius from 500 m up to 3 km and run the pharmacy search.",
  },
  {
    number: "03",
    title: "Review and evaluate",
    text: "Compare nearby pharmacies, analyse the area, and check feasible spots for a new one.",
  },
];

const CAPABILITIES = [
  {
    icon: "💊",
    title: "Pharmacy Discovery",
    text: "Find nearby pharmacies with walking distance, walking time and straight-line distance measured from your chosen point.",
  },
  {
    icon: "📊",
    title: "Geographic Analysis",
    text: "Count buildings, roads, facilities and points of interest inside the radius — readable statistics that never clutter the map.",
  },
  {
    icon: "📍",
    title: "Candidate Location Recommender",
    text: "Get up to three geographically valid spots where a new pharmacy would clear the 100 m walking-distance rule and would not sit on a road.",
  },
];

/**
 * Landing page — a short introduction to the product with a clear way
 * into the map application. Deliberately small: hero, how it works,
 * the three main capabilities, one final call to action.
 */
function LandingPage() {
  return (
    <div className="landing">
      <AppHeader activePath={ROUTES.home} />

      <main className="landing-main">
        <section className="hero">
          <span className="hero-kicker">Geographic pharmacy intelligence</span>

          <h1 className="hero-title">
            Find pharmacies around you, and see where a new one could{" "}
            <em>actually fit</em>.
          </h1>

          <p className="hero-subtitle">
            Pharmacy Locator searches a radius around any point you choose,
            measures real walking distances, summarises what the area
            contains, and tests candidate spots against the geographic
            rules a new pharmacy has to satisfy.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(ROUTES.app)}
            >
              Open the map app
            </button>
            <a className="btn btn-ghost" href="#capabilities">
              See what it does
            </a>
          </div>

          <p className="hero-meta">
            No sign-up · Runs entirely in your browser · Map data from
            OpenStreetMap
          </p>
        </section>

        <section className="landing-section" aria-labelledby="how-it-works">
          <div className="section-head">
            <span className="section-kicker">How it works</span>
            <h2 className="section-title" id="how-it-works">
              Three steps, one map
            </h2>
          </div>

          <ol className="steps">
            {STEPS.map((step) => (
              <li className="step" key={step.number}>
                <span className="step-number" aria-hidden="true">
                  {step.number}
                </span>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-text">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="landing-section"
          id="capabilities"
          aria-labelledby="capabilities-title"
        >
          <div className="section-head">
            <span className="section-kicker">Main capabilities</span>
            <h2 className="section-title" id="capabilities-title">
              Built around three questions
            </h2>
            <p className="section-text">
              What is nearby, what is in this area, and is there room for
              one more pharmacy?
            </p>
          </div>

          <div className="features">
            {CAPABILITIES.map((capability) => (
              <article className="feature" key={capability.title}>
                <span className="feature-icon" aria-hidden="true">
                  {capability.icon}
                </span>
                <h3 className="feature-title">{capability.title}</h3>
                <p className="feature-text">{capability.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <div>
            <h2 className="cta-title">Start exploring a neighbourhood</h2>
            <p className="cta-text">
              Pick a point on the map and see the pharmacies around it,
              the shape of the area, and the spots that clear the
              geographic rules.
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => navigate(ROUTES.app)}
          >
            Open the map app
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        Prototype — the 100 m minimum walking distance is a product
        assumption used for demonstration and still requires separate
        regulatory verification.
      </footer>
    </div>
  );
}

export default LandingPage;
