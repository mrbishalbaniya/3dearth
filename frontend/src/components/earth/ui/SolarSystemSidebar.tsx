"use client";

/**
 * Solar System layers + planet tour — shown instead of Earth GIS/Dry Earth
 * when the camera is in deep-space solar view.
 */
import { PLANET_DEFS, SUN_DEF } from "../solarSystem/catalog";
import type { SolarTourBodyId } from "../solarSystem/view";
import { useEarthStore } from "../store/earthStore";

function Switch({
  on,
  label,
  hint,
  onToggle,
}: {
  on: boolean;
  label: string;
  hint?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`earth-switch ${on ? "earth-switch--on" : ""}`}
      onClick={onToggle}
      aria-pressed={on}
    >
      <span className="earth-switch__track" aria-hidden>
        <span className="earth-switch__thumb" />
      </span>
      <span className="earth-switch__label">
        {label}
        {hint ? <span className="earth-switch__hint">{hint}</span> : null}
      </span>
    </button>
  );
}

const TOUR_BODIES: Array<{ id: SolarTourBodyId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "sun", label: SUN_DEF.label },
  { id: "mercury", label: "Mercury" },
  { id: "venus", label: "Venus" },
  { id: "earth", label: "Earth" },
  { id: "mars", label: "Mars" },
  { id: "jupiter", label: "Jupiter" },
  { id: "saturn", label: "Saturn" },
  { id: "uranus", label: "Uranus" },
  { id: "neptune", label: "Neptune" },
  { id: "pluto", label: "Pluto" },
];

export function SolarSystemSidebar({
  openSection,
  onToggleSection,
}: {
  openSection: string | null;
  onToggleSection: (id: string) => void;
}) {
  const selected = useEarthStore((s) => s.selectedSolarBody);
  const solarLayers = useEarthStore((s) => s.solarLayers);
  const setSolarLayer = useEarthStore((s) => s.setSolarLayer);
  const tourSolarBody = useEarthStore((s) => s.tourSolarBody);
  const layers = useEarthStore((s) => s.layers);
  const toggleLayer = useEarthStore((s) => s.toggleLayer);

  const def =
    selected && selected !== "overview" && selected !== "sun" && selected !== "earth"
      ? PLANET_DEFS.find((p) => p.id === selected)
      : null;

  const bodyTitle =
    selected === "sun"
      ? "Sun"
      : selected === "earth"
        ? "Earth"
        : selected === "overview" || !selected
          ? "System"
          : def?.label ?? "Planet";

  return (
    <>
      <div className={`earth-acc ${openSection === "tour" ? "earth-acc--open" : ""}`}>
        <button
          type="button"
          className="earth-acc__head"
          onClick={() => onToggleSection("tour")}
          aria-expanded={openSection === "tour"}
        >
          <span>Planet tour</span>
          <span className="earth-acc__meta">
            <span className="earth-acc__badge">{bodyTitle}</span>
            <span className="earth-acc__chevron" aria-hidden>
              {openSection === "tour" ? "▾" : "▸"}
            </span>
          </span>
        </button>
        {openSection === "tour" && (
          <div className="earth-acc__body">
            <p className="earth-sidebar__hint">
              Fly to each body. Layers below apply to the selected planet.
            </p>
            <div className="earth-basemap-modes earth-tour-grid">
              {TOUR_BODIES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`earth-chip ${selected === b.id || (!selected && b.id === "overview") ? "earth-chip--active" : ""}`}
                  onClick={() => tourSolarBody(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`earth-acc ${openSection === "body" ? "earth-acc--open" : ""}`}>
        <button
          type="button"
          className="earth-acc__head"
          onClick={() => onToggleSection("body")}
          aria-expanded={openSection === "body"}
        >
          <span>{bodyTitle} layers</span>
          <span className="earth-acc__meta">
            <span className="earth-acc__chevron" aria-hidden>
              {openSection === "body" ? "▾" : "▸"}
            </span>
          </span>
        </button>
        {openSection === "body" && (
          <div className="earth-acc__body">
            {selected === "overview" || !selected ? (
              <>
                <Switch
                  on={solarLayers.belts}
                  label="Asteroid & Kuiper belts"
                  onToggle={() => setSolarLayer("belts", !solarLayers.belts)}
                />
                <Switch
                  on={solarLayers.labels}
                  label="Body labels"
                  onToggle={() => setSolarLayer("labels", !solarLayers.labels)}
                />
                <Switch
                  on={layers.stars}
                  label="Stars & planets"
                  onToggle={() => toggleLayer("stars")}
                />
              </>
            ) : selected === "sun" ? (
              <>
                <p className="earth-sidebar__hint">
                  Photosphere + corona · IAU sidereal spin
                </p>
                <Switch
                  on={solarLayers.labels}
                  label="Label"
                  onToggle={() => setSolarLayer("labels", !solarLayers.labels)}
                />
              </>
            ) : selected === "earth" ? (
              <>
                <p className="earth-sidebar__hint">
                  Return home to use Dry Earth, GIS, and weather.
                </p>
                <button
                  type="button"
                  className="earth-chip earth-chip--active"
                  onClick={() => tourSolarBody("earth")}
                >
                  Focus Earth
                </button>
              </>
            ) : (
              <>
                {def?.atmosphere ? (
                  <Switch
                    on={solarLayers.atmosphere}
                    label="Atmosphere"
                    onToggle={() =>
                      setSolarLayer("atmosphere", !solarLayers.atmosphere)
                    }
                  />
                ) : null}
                {def?.clouds ? (
                  <Switch
                    on={solarLayers.clouds}
                    label="Clouds"
                    onToggle={() =>
                      setSolarLayer("clouds", !solarLayers.clouds)
                    }
                  />
                ) : null}
                {def?.rings ? (
                  <Switch
                    on={solarLayers.rings}
                    label="Rings"
                    onToggle={() => setSolarLayer("rings", !solarLayers.rings)}
                  />
                ) : null}
                {def && def.moons.length > 0 ? (
                  <Switch
                    on={solarLayers.moons}
                    label={`Moons (${def.moons.length})`}
                    onToggle={() => setSolarLayer("moons", !solarLayers.moons)}
                  />
                ) : (
                  <p className="earth-sidebar__hint">No major moons</p>
                )}
                <Switch
                  on={solarLayers.labels}
                  label="Label"
                  onToggle={() => setSolarLayer("labels", !solarLayers.labels)}
                />
                <div className="earth-sidebar__group">
                  <div className="earth-sidebar__group-label">Facts</div>
                  <div className="earth-weather-card">
                    <div className="earth-weather-card__meta">
                      Radius {def?.radiusKm.toLocaleString()} km
                      {def ? ` · ${def.radiusEarth.toFixed(3)} R⊕` : ""}
                    </div>
                    <div className="earth-weather-card__meta">
                      Day {Math.abs(def?.siderealDayDays ?? 0).toFixed(3)} d
                      {def && def.siderealDayDays < 0 ? " (retrograde)" : ""}
                    </div>
                    <div className="earth-weather-card__meta">
                      Tilt {def?.obliquityDeg.toFixed(2)}°
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className={`earth-acc ${openSection === "scene" ? "earth-acc--open" : ""}`}>
        <button
          type="button"
          className="earth-acc__head"
          onClick={() => onToggleSection("scene")}
          aria-expanded={openSection === "scene"}
        >
          <span>Scene</span>
          <span className="earth-acc__meta">
            <span className="earth-acc__chevron" aria-hidden>
              {openSection === "scene" ? "▾" : "▸"}
            </span>
          </span>
        </button>
        {openSection === "scene" && (
          <div className="earth-acc__body">
            <Switch
              on={layers.stars}
              label="Stars & planets"
              onToggle={() => toggleLayer("stars")}
            />
            <Switch
              on={layers.dayNight}
              label="Day / Night (Earth)"
              onToggle={() => toggleLayer("dayNight")}
            />
            <Switch
              on={solarLayers.belts}
              label="Belts"
              onToggle={() => setSolarLayer("belts", !solarLayers.belts)}
            />
          </div>
        )}
      </div>
    </>
  );
}
